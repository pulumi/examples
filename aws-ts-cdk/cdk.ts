// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as cdk from "@aws-cdk/core";
import * as cx from "@aws-cdk/cx-api";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * CDKStack is a Pulumi component which can deploy a CDK Stack as part of a Pulumi program.  This
 * enables using any component from the CDK Construct Library from within a Pulumi program.  The CDK
 * Stack is deployed as a CloudFormation template within the Pulumi-managed deployment.
 */
export class CDKStack extends pulumi.ComponentResource {
    /**
     * The CloudFormation stack containg the resources defined by the CDK Stack.
     */
    cloudformationStack: aws.cloudformation.Stack;
    /**
     * Constuct a CDKStack instance.
     */
    constructor(name: string, stackClass: typeof cdk.Stack, opts?: pulumi.ComponentResourceOptions) {
        const app = new cdk.App({ outdir: "./cdk.out" });
        const stack = new stackClass(app, name);
        const assembly = app.synth();
        const synthesizedStack = assembly.getStack(name);

        super("pulumicdk:app:stack", name, {
            template: synthesizedStack.template,
        }, opts);

        const parameters: any = {};
        if (synthesizedStack.assets.length !== 0) {
            const s3Assets = <cx.FileAssetMetadataEntry[]>synthesizedStack.assets.filter(asset => asset.packaging !== "container-image");
            const containerAssets = <cx.ContainerImageAssetMetadataEntry[]>synthesizedStack.assets.filter(asset => asset.packaging === "container-image");

            if (s3Assets.length !== 0) {
                const bucket = new aws.s3.Bucket(`${name}-assets`, {}, { parent: this });
                for (const asset of s3Assets) {
                    const source = asset.packaging === "zip"
                        ? new pulumi.asset.FileArchive("./cdk.out/${asset.path}")
                        : new pulumi.asset.FileAsset("./cdk.out/${asset.path}");
                    const _ = new aws.s3.BucketObject(`${name}-assets-${asset.s3KeyParameter}`, {
                        bucket: bucket,
                        key: asset.sourceHash,
                        source: source,
                    }, { parent: this });
                    parameters[asset.s3BucketParameter] = bucket.id;
                    parameters[asset.s3KeyParameter] = asset.sourceHash;
                    parameters[asset.artifactHashParameter] = asset.sourceHash;
                }
            }

            if (containerAssets.length !== 0) {
                throw new Error("NYI: container assets");
            }
        }

        this.cloudformationStack = new aws.cloudformation.Stack(name, {
            templateBody: JSON.stringify(synthesizedStack.template),
            disableRollback: true,
            capabilities: ["CAPABILITY_IAM"],
        }, { parent: this });

        this.registerOutputs(this.cloudformationStack.outputs);
    }
}
