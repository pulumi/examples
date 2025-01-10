// Copyright 2016-2022, Pulumi Corporation. All rights reserved.

import * as aws from "@pulumi/aws";
import {
    ReportViolation,
    ResourceValidationArgs,
    ResourceValidationPolicy,
    StackValidationPolicy,
    EnforcementLevel,
    validateResourceOfType,
} from "@pulumi/policy";

export function requireCloudWatchLogRetention(
    name: string,
    numDays: number,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    return {
        name: name,
        description: "CloudWatch Log Retention Days Should Be Set",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(
            aws.cloudwatch.LogGroup,
            (logGroup, args, reportViolation) => {
                if (
                    logGroup.retentionInDays == undefined ||
                    (!logGroup.retentionInDays !== undefined &&
                        logGroup.retentionInDays <= numDays)
                ) {
                    reportViolation(
                        `Log Group Retention must be set, and less than ${numDays.toString()}`
                    );
                }
            }
        ),
    };
}
