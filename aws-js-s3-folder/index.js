"use strict";

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const path = require("path");
const fs = require("fs");
const mime = require("mime");

// Create a bucket and expose a website index document
const siteBucket = new aws.s3.Bucket("s3-website-bucket", {
    website: {
        indexDocument: "index.html",
    },
});

// Configure ownership controls for the new S3 bucket
const ownershipControls = new aws.s3.BucketOwnershipControls("ownership-controls", {
    bucket: siteBucket.id,
    rule: {
        objectOwnership: "ObjectWriter",
    },
});

// Configure public ACL block on the new S3 bucket
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: siteBucket.id,
    blockPublicAcls: false,
});

let siteDir = "www"; // directory for content files

// For each file in the directory, create an S3 object stored in `siteBucket`
for (let item of fs.readdirSync(siteDir)) {
    let filePath = path.join(siteDir, item);
    let object = new aws.s3.BucketObject(item, {
        bucket: siteBucket,                               // reference the s3.Bucket object
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
    }, { dependsOn: [ownershipControls, publicAccessBlock] });
}

// Set the access policy for the bucket so all objects are readable
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
}, { dependsOn: [ownershipControls, publicAccessBlock] });

// Stack exports
exports.bucketName = siteBucket.bucket;
exports.websiteUrl = siteBucket.websiteEndpoint;
