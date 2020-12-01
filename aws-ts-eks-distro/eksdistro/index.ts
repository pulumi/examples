import * as pulumi from "@pulumi/pulumi";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as mustache from "mustache";
import * as tmp from "tmp";

interface ClusterProviderArgs {
    // KOPS_STATE_STORE
    state: string;
    // KOPS_CLUSTER_NAME
    name: string;
}

const clusterYamlTemplate = fs.readFileSync(path.join(__dirname, "cluster.yaml")).toString();
const authenticatorYamlTemplate = fs.readFileSync(path.join(__dirname, "aws-iam-authenticator.yaml")).toString();

const clusterprovider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: ClusterProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const clusterYaml = mustache.render(clusterYamlTemplate, { 
            CLUSTER_NAME: inputs.name,
            STATE_STORE: inputs.state,
        });
        console.log("kops create")
        const createOut = cp.execSync(`kops create --name ${inputs.name} --state ${inputs.state} -f -`, { input: clusterYaml });
        console.log(createOut.toString());
        console.log("kops create secret")
        const createSecretOut = cp.execSync(`kops create secret --name ${inputs.name} --state ${inputs.state} sshpublickey admin -i ~/.ssh/id_rsa.pub`);
        console.log(createSecretOut.toString());

        let outs = { ...inputs };
        try {
            const updateRes = await this.update!(inputs.name, {}, inputs);
            outs = { ...outs, ...updateRes.outs};
        } catch (err) {
            console.log(err);
        }
        
        return { 
            id: inputs.name, 
            outs,
        };
    },
    async update(id: pulumi.ID, olds: any, inputs: any): Promise<pulumi.dynamic.UpdateResult> {
        const clusterYaml = mustache.render(clusterYamlTemplate, { 
            CLUSTER_NAME: inputs.name,
            STATE_STORE: inputs.state,
        });
        const authenticatorYaml = mustache.render(authenticatorYamlTemplate, { 
            CLUSTER_NAME: inputs.name,
        });

        console.log("kops update cluster")
        const updateOut = cp.execSync(`kops update cluster --name ${inputs.name} --state ${inputs.state} --yes`);
        console.log(updateOut.toString());

        console.log("kops export kubecfg")
        const kubeConfigName = tmp.tmpNameSync();
        const exportKubeconfigOut = cp.execSync(`kops export kubecfg --name ${inputs.name} --state ${inputs.state} --kubeconfig ${kubeConfigName}`);
        const kubeconfig = fs.readFileSync(kubeConfigName).toString();
        console.log(exportKubeconfigOut.toString());

        // Needed to allow cluster to come available and DNS to propagate
        try {
            console.log("kops validate cluster")
            const validateOut = cp.execSync(`kops validate cluster --wait 2m --name ${inputs.name} --state ${inputs.state}`);
            console.log(validateOut.toString());

            console.log("kubectl apply -f aws-iam-authenticator.yaml");
            const authApplyOut = cp.execSync(`kubectl apply -f -`, { input: authenticatorYaml });
            console.log(authApplyOut.toString());
        } catch (err) {
            console.log(err);
        }
        
        return {
            outs: {
                ...inputs,
                kubeconfig,
            },
        }
    },
    async delete(id: pulumi.ID, inputs: any) {
        const clusterYaml = mustache.render(clusterYamlTemplate, { 
            CLUSTER_NAME: inputs.name,
            STATE_STORE: inputs.state,
        });
        console.log("kops delete")
        const deleteOut = cp.execSync(`kops delete --name ${inputs.name} --state ${inputs.state} --yes -f -`, { input: clusterYaml });
        console.log(deleteOut.toString());
    },
}

export interface ClusterArgs {
        // KOPS_STATE_STORE
        state: pulumi.Input<string>;
        // KOPS_CLUSTER_NAME
        name: pulumi.Input<string>;
        keeper?: pulumi.Input<number>;
}

export class Cluster extends pulumi.dynamic.Resource {
    kubeconfig!: pulumi.Output<string>;
    constructor(name: string, args: ClusterArgs, opts?: pulumi.CustomResourceOptions) {
        super(clusterprovider, name, {
            ... args, 
            kubeconfig: undefined,
        }, opts);
    }
}
