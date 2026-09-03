// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import mime from "mime";

// S3Folder is a reusable component that serves the contents of a local directory
// as a static website on Amazon S3. It groups the underlying bucket, website
// configuration, objects, and access policy under a single logical resource.
export class S3Folder extends pulumi.ComponentResource {
    public readonly bucketName: pulumi.Output<string>;
    public readonly websiteUrl: pulumi.Output<string>;

    constructor(bucketName: string, siteDir: string, opts?: pulumi.ComponentResourceOptions) {
        // Register this component with the name examples:S3Folder. Passing the
        // component itself as the parent of every child resource nests them in
        // the CLI and Pulumi Cloud views.
        super("examples:S3Folder", bucketName, {}, opts);

        // Create a bucket and expose a website index document.
        const siteBucket = new aws.s3.Bucket(bucketName, {}, { parent: this });

        const siteBucketWebsiteConfig = new aws.s3.BucketWebsiteConfiguration(`${bucketName}-config`, {
            bucket: siteBucket.id,
            indexDocument: {
                suffix: "index.html",
            },
        }, { parent: this });

        const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(`${bucketName}-public-access-block`, {
            bucket: siteBucket.id,
            blockPublicAcls: false,
        }, { parent: this });

        // For each file in the directory, create an S3 object stored in `siteBucket`.
        for (const item of fs.readdirSync(siteDir)) {
            const filePath = path.join(siteDir, item);
            new aws.s3.BucketObject(item, {
                bucket: siteBucket.bucket,                        // reference the s3.Bucket object
                source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
                contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
            }, { parent: this });
        }

        // Set the access policy for the bucket so all objects are readable.
        const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
            bucket: siteBucket.id, // refer to the bucket created earlier
            policy: pulumi.jsonStringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "s3:GetObject",
                    ],
                    Resource: [
                        pulumi.interpolate `${siteBucket.arn}/*`,
                    ],
                }],
            }),
        }, { parent: this, dependsOn: publicAccessBlock });

        // Expose the bucket name and website URL as component outputs so
        // consumers can chain dependencies on them.
        this.bucketName = siteBucket.bucket;
        this.websiteUrl = siteBucketWebsiteConfig.websiteEndpoint;
        this.registerOutputs({
            bucketName: this.bucketName,
            websiteUrl: this.websiteUrl,
        });
    }
}
