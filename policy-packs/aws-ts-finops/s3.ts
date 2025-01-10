// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import {
    ReportViolation,
    ResourceValidationArgs,
    ResourceValidationPolicy,
    StackValidationPolicy,
    EnforcementLevel,
    validateResourceOfType,
} from "@pulumi/policy";

//Bucket Lifecycle exists
export function requireBucketLifecycleRules(
    name: string,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    return {
        name: name,
        description: "Bucket should have lifecycle rules",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(
            aws.s3.Bucket,
            (bucket, args, reportViolation) => {
                if (
                    bucket.lifecycleRules == undefined ||
                    (!bucket.lifecycleRules !== undefined &&
                        bucket.lifecycleRules.length == 0)
                ) {
                    reportViolation(`S3 Bucket must have lifecycle rules`);
                }
            }
        ),
    };
}

export function requireSpecificBucketExpirationDays(
    name: string,
    numDays: number,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    return {
        name: name,
        description: "S3 Bucket Expiration Set",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(
            aws.s3.Bucket,
            (bucket, args, reportViolation) => {
                if (bucket.lifecycleRules !== undefined) {
                    bucket.lifecycleRules.forEach(function (lr) {
                        if (
                            lr.expiration == undefined ||
                            (!lr.expiration !== undefined &&
                                lr.expiration <= numDays)
                        ) {
                            reportViolation(
                                `S3 Bucket lifecycle expiration show be set to less than ${numDays.toString()}`
                            );
                        }
                    });
                }
            }
        ),
    };
}
