// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const getS3Location = (bucket: aws.s3.Bucket, tableName: string): pulumi.Output<string> => {
    return pulumi.interpolate`s3://${pulumi.stringSplit(bucket.arn, ":::")[1]}/${tableName}`;
};
