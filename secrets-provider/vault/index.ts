import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Import config
const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

// Apply-time guard: prevent using preview placeholder names on apply
if (!pulumi.runtime.isDryRun() && bucketName.startsWith("preview-")) {
    throw new Error("Configure a real bucketName before 'pulumi up'. Example: pulumi config set pulumi-vault-kms:bucketName <unique-bucket-name>");
}

// Create a private bucket.
//
// The configuration is kept very simple as the goal of this example is to demonstrate KMS encryption, not storing
// secrets in buckets securely. In a real-world scenario if you are certain you need to be storing sensitive data in
// buckets and have eliminated other storage options, consider setting up a custom KMS key, enforcing TLS, and enabling
// versioning for the bucket.
const bucket = new aws.s3.Bucket("bucket", {
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
