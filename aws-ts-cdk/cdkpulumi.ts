import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as cdk from "@aws-cdk/cdk";

export class CDKStack extends pulumi.ComponentResource {
    cloudformationStack:  aws.cloudformation.Stack;
    constructor(name: string, stackClass: typeof cdk.Stack, opts?: pulumi.ComponentResourceOptions) {
        const app = new cdk.App();
        const context: { [ key: string]: any} = {
            "availability-zones:account=153052954103:region=us-west-2":["us-west-2a","us-west-2b","us-west-2c"],
            "aws:cdk:toolkit:default-region":"us-west-2",
            "aws:cdk:toolkit:default-account":"153052954103"
        };
        for (const key in context) {
            app.setContext(key, context[key]);
        }
        const stack = new stackClass(app, name);
        const synthesized = app.synthesizeStack(name);

        super("pulumi-cdk:app:component", name, {
            template: synthesized.template,
        }, opts);
        
        this.cloudformationStack = new aws.cloudformation.Stack(name, {
            templateBody: JSON.stringify(synthesized.template),
            onFailure: "DELETE",
        }, { parent: this });
    }
}
