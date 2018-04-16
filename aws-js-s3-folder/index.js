"use strict";

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const mime = require("mime");

let siteBucket = new aws.s3.Bucket("s3-website-bucket", {
    websites: [{
        indexDocument: "index.html",
    }],
});

let siteDir = "www";

for (let item of require("fs").readdirSync(siteDir)) {
    let filePath = require("path").join(siteDir, item);

    let object = new aws.s3.BucketObject(item, { 
        bucket: siteBucket,
        source: new pulumi.asset.FileAsset(filePath),
        contentType: mime.getType(filePath) || undefined
    });
}

exports.websiteUrl = siteBucket.websiteEndpoint;

// Function for adding a bucket policy
function createS3PublicReadPolicy(bucketName) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: [
                "s3:GetObject"
            ],
            Resource: [
                `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
            ]
        }]
    })
}

let bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: siteBucket.bucket,
    policy: siteBucket.bucket.apply(createS3PublicReadPolicy) // use output property `siteBucket.bucket`
});
