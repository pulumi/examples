// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as awsnative from "@pulumi/aws-native";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as mime from "mime";

// Create a bucket and expose a website index document
const siteBucket = new awsnative.s3.Bucket("s3-website-bucket", {
    websiteConfiguration: {
        indexDocument: "index.html",
    },
});

const siteDir = "www"; // directory for content files

// For each file in the directory, create an S3 object stored in `siteBucket`
for (const item of fs.readdirSync(siteDir)) {
    const filePath = require("path").join(siteDir, item);
    const siteObject = new aws.s3.BucketObject(item, {
        bucket: siteBucket.id,                            // reference the s3.Bucket object
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
    });
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
});

// Stack exports
export const bucketName = siteBucket.bucketName;
export const websiteUrl = siteBucket.websiteURL;
