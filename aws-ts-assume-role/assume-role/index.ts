// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const roleToAssumeARN = config.require("roleToAssumeARN");

const provider = new aws.Provider("privileged", {
    assumeRoles: [{
        roleArn: roleToAssumeARN,
        sessionName: "PulumiSession",
        externalId: "PulumiApplication",
    }],
    region: aws.config.requireRegion(),
});

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2("my-bucket", {}, {provider: provider});

// Export the DNS name of the bucket
export const bucketName = bucket.bucketDomainName;
