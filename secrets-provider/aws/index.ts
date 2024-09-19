import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { secret } from "@pulumi/pulumi";

// Import config
const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

export function configureACL(bucketName: string, bucket: aws.s3.BucketV2, acl: string): aws.s3.BucketAclV2 {
    const ownership = new aws.s3.BucketOwnershipControls(bucketName, {
        bucket: bucket.bucket,
        rule: {
            objectOwnership: "BucketOwnerPreferred",
        }
    });
    const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(bucketName, {
        bucket: bucket.bucket,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    });
    const bucketACL = new aws.s3.BucketAclV2(bucketName, {
        bucket: bucket.bucket,
        acl: acl,
    }, {
        dependsOn: [ownership, publicAccessBlock]
    });
    return bucketACL;
}

// Create a private bucket
const bucket = new aws.s3.BucketV2("bucket", {
    bucket: bucketName,
});

configureACL("bucket", bucket, "private");

// Create an object from the secret value
const superSecretObject = new aws.s3.BucketObject("secret", {
    bucket: bucket.id,
    key: "secret",
    content: secretValue,
})

// Export the name of the bucket and the secretValue
export const bucketId = bucket.id;
export const secretId = secretValue;
