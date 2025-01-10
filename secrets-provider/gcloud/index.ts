import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Import config
const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

// Create a GCP resource (Storage Bucket)
const bucket = new gcp.storage.Bucket("bucket", {
    name: bucketName,
    location: "US",
});


const superSecretObject = new gcp.storage.BucketObject("secret", {
    bucket: bucket.id,
    name: "secret",
    content: secretValue,
})

export const bucketUrl = bucket.url;
export const secretId = secretValue;
