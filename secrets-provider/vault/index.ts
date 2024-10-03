import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { secret } from "@pulumi/pulumi";

// Import config
const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

// Create a private bucket.
//
// The configuration is kept very simple as the goal of this example is to demonstrate KMS encryption, not storing
// secrets in buckets securely. In a real-world scenario if you are certain you need to be storing sensitive data in
// buckets and have eliminated other storage options, consider setting up a custom KMS key, enforcing TLS, and enabling
// versioning for the bucket.
const bucket = new aws.s3.BucketV2("bucket", {
    bucket: bucketName,
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
