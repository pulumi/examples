// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

export function generateCanaryPolicy(canaryResultsBucketArn: pulumi.Input<string>) {
    return pulumi.jsonStringify({
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "s3:PutObject",
                  "s3:GetObject",
              ],
              "Resource": [
                  `${canaryResultsBucketArn}/*`,
              ],
          },
          {
              "Effect": "Allow",
              "Action": [
                  "s3:GetBucketLocation",
              ],
              "Resource": [
                  canaryResultsBucketArn,
              ],
          },
          {
              "Effect": "Allow",
              "Action": [
                  "s3:ListAllMyBuckets",
                  "xray:PutTraceSegments",
              ],
              "Resource": [
                  "*",
              ],
          },
          {
              "Effect": "Allow",
              "Resource": "*",
              "Action": "cloudwatch:PutMetricData",
              "Condition": {
                  "StringEquals": {
                      "cloudwatch:namespace": "CloudWatchSynthetics",
                  },
              },
          },
      ],
    });
  }
