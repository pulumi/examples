// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as cdk from "@aws-cdk/core";
import * as cx from "@aws-cdk/cx-api";

export function createStack(name: string, stackClass: typeof cdk.Stack): aws.cloudformation.Stack {
    const app = new cdk.App({outdir: "./cdk.out"});
    const stack = new stackClass(app, name);
    const assembly = app.synth();

    const synthesizedStack = assembly.getStack(name);
    const parameters: any = {};
    if (synthesizedStack.assets.length !== 0) {
        const s3Assets = <cx.FileAssetMetadataEntry[]>synthesizedStack.assets.filter(asset => asset.packaging !== "container-image");
        const containerAssets = <cx.ContainerImageAssetMetadataEntry[]>synthesizedStack.assets.filter(asset => asset.packaging === "container-image");

        if (containerAssets.length !== 0) {
            throw new Error("NYI: container assets");
        }

        if (s3Assets.length !== 0) {
            throw new Error("NYI: container assets");
            // // Create an S3 bucket to hold the stack's assets.
            // const bucket = new cloudformation.s3.Bucket(`${name}assets`);
            // const uploader = bucket.id.apply(async bucketId => {
            //     const s3 = new aws.S3({region: cloudformation.region});
            //     const uploads = s3Assets.map(async asset => {
            //         try {
            //             let content: Buffer;
            //             const path = `./cdk.out/${asset.path}`;
            //             if (asset.packaging === "zip") {
            //                 const archive = new zip();
            //                 archive.addLocalFolder(path, "/");
            //                 content = archive.toBuffer();
            //             } else {
            //                 content = fs.readFileSync(path);
            //             }
            //             await s3.upload({
            //                 Bucket: bucketId,
            //                 Key: asset.sourceHash,
            //                 Body: content,
            //             }).promise();
            //         } catch (e) {
            //             console.log(`upload failed: ${e}`);
            //         }
            //     });
            //     await Promise.all(uploads);
            //     return bucketId;
            // });

            // for (const asset of s3Assets) {
            //     parameters[asset.s3BucketParameter] = uploader;
            //     parameters[asset.s3KeyParameter] = asset.sourceHash;
            //     parameters[asset.artifactHashParameter] = asset.sourceHash;
            // }
        }
    }

    const cloudformationStack = new aws.cloudformation.Stack("s", {
        templateBody: JSON.stringify(synthesizedStack.template),
        disableRollback: true,
        capabilities: ["CAPABILITY_IAM"],
    });

    return cloudformationStack;
}
