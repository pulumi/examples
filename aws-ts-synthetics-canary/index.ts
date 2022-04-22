// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { generateCanaryPolicy } from "./canaryPolicy";

// Used for naming convention
const baseName = "canary";

// Bucket for storing canary RESULTS
const canaryResultsS3Bucket = new aws.s3.BucketV2(`${baseName}-results`, {
  // This allows the bucket to be destroyed even if it contains canary results.
  forceDestroy: true,
});

// Canary execution role to allow the canary (lambda) to run.
// Note though that if the canary code itself has to interact with AWS resources, then the role needs the
// policies to allow the canary to do so.
// The canary used in this example does not interact with any AWS resources,
// So no canary-specific permissions are needed.
const canaryExecutionRole = new aws.iam.Role(`${baseName}-exec-role`, {
  assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
          {
              Action: "sts:AssumeRole",
              Effect: "Allow",
              Principal: {
                  Service: "lambda.amazonaws.com",
              },
          },
      ],
  },
});
const canaryExecutionPolicy = new aws.iam.RolePolicy(`${baseName}-exec-policy`, {
  role: canaryExecutionRole.id,
  policy: canaryResultsS3Bucket.arn.apply(arn => generateCanaryPolicy(arn)),
});

// Bucket for storing the canary SCRIPTS
const canaryScriptsBucket = new aws.s3.BucketV2(`${baseName}-scripts`);
// Enable versioning so that as new scripts are uploaded the canary will be updated as well.
const canaryScriptBucketVersioning = new aws.s3.BucketVersioningV2(`${baseName}-scripts-versioning`, {
  bucket: canaryScriptsBucket.id,
  versioningConfiguration: {
    status: "Enabled",
  },
});
// zip up, upload and deploy the "simple canary"
const canaryScriptArchive = new pulumi.asset.FileArchive("./canaries/simple-canary/");
const canaryScriptObject = new aws.s3.BucketObjectv2(`${baseName}-script`, {
  bucket: canaryScriptBucketVersioning.bucket,
  source: canaryScriptArchive,
});

// Create the canary.
const canary = new aws.synthetics.Canary(`${baseName}-simple`, {
  artifactS3Location: pulumi.interpolate`s3://${canaryResultsS3Bucket.id}`,
  executionRoleArn: canaryExecutionRole.arn,
  handler: "exports.handler",
  runtimeVersion: "syn-nodejs-puppeteer-3.5",
  schedule: {
      expression: "rate(1 minute)",
  },
  s3Bucket: canaryScriptsBucket.id,
  s3Key: canaryScriptObject.id,
  s3Version: canaryScriptObject.versionId,
  startCanary: true,
});

export const simpleCanaryName = canary.name;
export const simpleCanaryArn = canary.arn;
