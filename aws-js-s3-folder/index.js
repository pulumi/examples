"use strict";

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const mime = require("mime");

// Create a bucket and expose a website index document
let siteBucket = new aws.s3.Bucket("s3-website-bucket", {
    website: {
        indexDocument: "index.html",
    },
});

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: siteBucket.id,
    blockPublicAcls: false,
});

let siteDir = "www"; // directory for content files

// For each file in the directory, create an S3 object stored in `siteBucket`
for (let item of require("fs").readdirSync(siteDir)) {
    let filePath = require("path").join(siteDir, item);
    let object = new aws.s3.BucketObject(item, {
        bucket: siteBucket,                               // reference the s3.Bucket object
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
    });
}

// Create an S3 Bucket Policy to allow public read of all objects in bucket
function publicReadPolicyForBucket(bucketName) {
    return {
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
    };
}

// Set the access policy for the bucket so all objects are readable
let bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: siteBucket.bucket, // refer to the bucket created earlier
    policy: siteBucket.bucket.apply(publicReadPolicyForBucket) // use output property `siteBucket.bucket`
}, { dependsOn: publicAccessBlock });

// Stack exports
exports.bucketName = siteBucket.bucket;
exports.websiteUrl = siteBucket.websiteEndpoint;
