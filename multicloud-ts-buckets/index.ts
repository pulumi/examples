// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as gcp from "@pulumi/gcp";

// Create an AWS resource (S3 Bucket)
const awsBucket = new aws.s3.Bucket("my-bucket");

// Create a GCP resource (Storage Bucket)
const gcpBucket = new gcp.storage.Bucket("my-bucket");

// Export the names of the buckets
export const bucketNames = [
    awsBucket.bucket,
    gcpBucket.name,
];

