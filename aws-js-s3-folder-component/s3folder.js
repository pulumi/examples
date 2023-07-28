"use strict";

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const mime = require("mime");

// Define a component for serving a static website on S3
class S3Folder extends pulumi.ComponentResource {

    constructor(bucketName, path, opts) {
        super("pulumi:examples:S3Folder", bucketName, {}, opts); // Register this component with name pulumi:examples:S3Folder

        // Create a bucket and expose a website index document
        let siteBucket = new aws.s3.Bucket(bucketName, {
            website: {
                indexDocument: "index.html",
            },
        }, { parent: this }); // specify resource parent
        
        const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
            bucket: siteBucket.id,
            blockPublicAcls: false,
        }, { parent: this });

        // For each file in the directory, create an S3 object stored in `siteBucket`
        for (let item of require("fs").readdirSync(path)) {
            let filePath = require("path").join(path, item);
            let object = new aws.s3.BucketObject(item, {
                bucket: siteBucket,                               // reference the s3.Bucket object
                source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
                contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
            }, { parent: this }); // specify resource parent
        }

        // Set the access policy for the bucket so all objects are readable
        let bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
            bucket: siteBucket.bucket,
            policy: siteBucket.bucket.apply(this.publicReadPolicyForBucket),
        }, { parent: this, dependsOn: publicAccessBlock }); // specify resource parent

        this.bucketName = siteBucket.bucket;
        this.websiteUrl = siteBucket.websiteEndpoint;

        // Register output properties for this component
        this.registerOutputs({
            bucketName: this.bucketName,
            websiteUrl: this.websiteUrl,
        });
    }

    publicReadPolicyForBucket(bucketName) {
        return JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: "*",
                Action: [
                    "s3:GetObject"
                ],
                Resource: [
                    `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
                ]
            }]
        });
    }
}

module.exports.S3Folder = S3Folder;
