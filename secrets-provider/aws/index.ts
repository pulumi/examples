import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { secret } from "@pulumi/pulumi";

// Import config
const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

// Create a private bucket
const bucket = new aws.s3.Bucket("bucket", {
    bucket: bucketName,
    acl: "private",
});

// Create an object from the secret value
const superSecretObject = new aws.s3.BucketObject("secret", {
    bucket: bucket.id,
    key: "secret",
    content: secretValue,
})

// Export the name of the bucket and the secretValue
export const bucketId = bucket.id;
export const secretId = secretValue;
