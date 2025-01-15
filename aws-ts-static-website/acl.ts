// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

export function configureACL(bucketName: string, bucket: aws.s3.BucketV2, acl: string): aws.s3.BucketAclV2 {
    const ownership = new aws.s3.BucketOwnershipControls(bucketName, {
        bucket: bucket.bucket,
        rule: {
            objectOwnership: "BucketOwnerPreferred",
        },
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
        dependsOn: [ownership, publicAccessBlock],
    });
    return bucketACL;
}
