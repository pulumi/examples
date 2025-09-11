// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const roleToAssumeARN = config.require("roleToAssumeARN");

const isPreview = pulumi.runtime.isDryRun();
// Apply-time guard: prevent using preview placeholder on apply
if (!isPreview && /^arn:aws:iam::123456789012:role\/preview-/.test(roleToAssumeARN)) {
    throw new Error("Configure a real roleToAssumeARN before 'pulumi up'. Example: pulumi config set aws-ts-assume-role:roleToAssumeARN arn:aws:iam::<account>:role/<roleName>");
}
const baseProviderArgs: aws.ProviderArgs = {
    region: aws.config.requireRegion(),
};
const provider = new aws.Provider(
    "privileged",
    isPreview
        ? baseProviderArgs
        : {
              ...baseProviderArgs,
              assumeRoles: [
                  {
                      roleArn: roleToAssumeARN,
                      sessionName: "PulumiSession",
                      externalId: "PulumiApplication",
                  },
              ],
          },
);

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket("my-bucket", {}, {provider: provider});

// Export the DNS name of the bucket
export const bucketName = bucket.bucketDomainName;
