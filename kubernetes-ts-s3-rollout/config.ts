// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as fs from "fs";

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as mime from "mime";

// Create a bucket and expose a website index document
const siteBucket = new aws.s3.Bucket("s3-website-bucket", {
    website: {
        indexDocument: "index.html",
    },
});

const siteDir = "www"; // directory for content files

// For each file in the directory, create an S3 object stored in `siteBucket`
for (const item of fs.readdirSync(siteDir)) {
    const filePath = require("path").join(siteDir, item);
    const object = new aws.s3.BucketObject(item, {
        bucket: siteBucket, // reference the s3.Bucket object
        source: new pulumi.asset.FileAsset(filePath), // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
    });
}

// Create an S3 Bucket Policy to allow public read of all objects in bucket
function publicReadPolicyForBucket(bucketName) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [
                    `arn:aws:s3:::${bucketName}/*`, // policy refers to bucket name explicitly
                ],
            },
        ],
    });
}

// Set the access policy for the bucket so all objects are readable
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: siteBucket.bucket, // refer to the bucket created earlier
    policy: siteBucket.bucket.apply(publicReadPolicyForBucket), // use output property `siteBucket.bucket`
});

// Stack exports
export const bucketName = siteBucket.bucket;
export const websiteUrl = siteBucket.websiteEndpoint;
