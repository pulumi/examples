// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as azuread from "@pulumi/azuread";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";

// Arguments for an AKS cluster. We use almost all defaults for this example, but the
// interface could be extended with e.g. agent pool settings.
export interface AksClusterArgs {
    resourceGroupName: pulumi.Input<string>;
    kubernetesVersion: pulumi.Input<string>;
    vmSize: pulumi.Input<string>;
    vmCount: pulumi.Input<number>;
}

export class AksCluster extends pulumi.ComponentResource {
    public cluster: azure.containerservice.KubernetesCluster;
    public provider: k8s.Provider;

    constructor(name: string,
                args: AksClusterArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:keda:AksCluster", name, args, opts);

        const password = new random.RandomPassword("password", {
            length: 20,
            special: true,
        }).result;
        const sshPublicKey = new tls.PrivateKey("keda", {
            algorithm: "RSA",
            rsaBits: 4096,
        }).publicKeyOpenssh;

        // Create the AD service principal for the K8s cluster.
        const adApp = new azuread.Application("aks", {displayName: "aks"}, { parent: this });
        const adSp = new azuread.ServicePrincipal("aksSp", { applicationId: adApp.applicationId }, { parent: this });
        const adSpPassword = new azuread.ServicePrincipalPassword("aksSpPassword", {
            servicePrincipalId: adSp.id,
            value: password,
            endDate: "2099-01-01T00:00:00Z",
        }, { parent: this });

        // Create a Virtual Network for the cluster
        const vnet = new azure.network.VirtualNetwork("keda", {
            resourceGroupName: args.resourceGroupName,
            addressSpaces: ["10.2.0.0/16"],
        }, { parent: this });

        // Create a Subnet for the cluster
        const subnet = new azure.network.Subnet("keda", {
            resourceGroupName: args.resourceGroupName,
            virtualNetworkName: vnet.name,
            addressPrefix: "10.2.1.0/24",
        }, { parent: this });

        // Now allocate an AKS cluster.
        this.cluster = new azure.containerservice.KubernetesCluster("aksCluster", {
            resourceGroupName: args.resourceGroupName,
            defaultNodePool: {
                name: "aksagentpool",
                nodeCount: args.vmCount,
                vmSize: args.vmSize,
                osDiskSizeGb: 30,
                vnetSubnetId: subnet.id,
            },
            dnsPrefix: name,
            linuxProfile: {
                adminUsername: "aksuser",
                sshKey: {
                    keyData: sshPublicKey,
                },
            },
            servicePrincipal: {
                clientId: adApp.applicationId,
                clientSecret: adSpPassword.value,
            },
            kubernetesVersion: args.kubernetesVersion,
            roleBasedAccessControl: { enabled: true },
            networkProfile: {
                networkPlugin: "azure",
                dnsServiceIp: "10.2.2.254",
                serviceCidr: "10.2.2.0/24",
                dockerBridgeCidr: "172.17.0.1/16",
            },
        }, { parent: this });

        // Expose a K8s provider instance using our custom cluster instance.
        this.provider = new k8s.Provider("aksK8s", {
            kubeconfig: this.cluster.kubeConfigRaw,
        }, { parent: this });

        this.registerOutputs();
    }
}
