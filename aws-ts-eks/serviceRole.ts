import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as crypto from "crypto";

// sha1hash returns a partial SHA1 hash of the input string.
function sha1hash(s: string): string {
    const shasum: crypto.Hash = crypto.createHash("sha1");
    shasum.update(s);
    // Limit the size of hashes to ensure we generate shorter/ resource names.
    return shasum.digest("hex").substring(0, 8);
}

export interface ServiceRoleArgs {
    /**
     * The service associated with this role.
     */
    readonly service: pulumi.Input<string>;
    /**
     * The description of the role.
     */
    readonly description?: pulumi.Input<string>;
    /**
     * One or more managed policy ARNs to attach to this role.
     */
    readonly managedPolicyArns?: string[];
}

export class ServiceRole extends pulumi.ComponentResource {
    // The service role.
    public readonly role: pulumi.Output<aws.iam.Role>;

    constructor(name: string, args: ServiceRoleArgs, opts?: pulumi.ResourceOptions) {
        super("ServiceRole", name, args, opts);

        const assumeRolePolicy = pulumi.output(args.service).apply(service => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "sts:AssumeRole",
                ],
                Effect: "Allow",
                Principal: {
                    Service: [ service ],
                },
            }],
        }));
        const role = new aws.iam.Role(`${name}-role`, {
            description: args.description,
            assumeRolePolicy: assumeRolePolicy,
        }, { parent: this });
        const rolePolicyAttachments = [];
        for (const policy of (args.managedPolicyArns || [])) {
            rolePolicyAttachments.push(new aws.iam.RolePolicyAttachment(`${name}-${sha1hash(policy)}`, {
                policyArn: policy,
                role: role,
            }, { parent: this }));
        }
        this.role = pulumi.all([role.arn, ...rolePolicyAttachments.map(r => r.id)]).apply(() => role);

        this.registerOutputs({ role: this.role });
    }
}
