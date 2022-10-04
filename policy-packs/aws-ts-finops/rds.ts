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
import * as utils from "./utils";

export function requireRdsInstanceType(
    name: string,
    instanceTypes: aws.rds.InstanceType | Iterable<aws.rds.InstanceType>,
    enforcementLevel: EnforcementLevel = "advisory"
): ResourceValidationPolicy {
    const types = utils.toStringSet(instanceTypes);

    return {
        name: name,
        description: "RDS instances should use approved instance types.",
        enforcementLevel: enforcementLevel,
        validateResource: [
            validateResourceOfType(
                aws.rds.Instance,
                (instance, args, reportViolation) => {
                    if (
                        instance.instanceClass !== undefined &&
                        !types.has(instance.instanceClass)
                    ) {
                        reportViolation(
                            "RDS Instance should use the approved instance types."
                        );
                    }
                }
            ),
            validateResourceOfType(
                aws.rds.ClusterInstance,
                (ci, args, reportViolation) => {
                    if (!types.has(ci.instanceClass)) {
                        reportViolation(
                            "ClusterInstance should use the approved instance types."
                        );
                    }
                }
            ),
        ],
    };
}

export function requireRdsVolumesGp2(
    name: string,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    return {
        name: name,
        description: "RDS StorageType Should be gp2",
        enforcementLevel: enforcementLevel,
        validateResource: [
            validateResourceOfType(
                aws.rds.Instance,
                (instance, args, reportViolation) => {
                    if (
                        instance.storageType !== undefined &&
                        instance.storageType != "gp2"
                    ) {
                        reportViolation(
                            "RDS Instance should use gp2 storage type"
                        );
                    }
                }
            ),
        ],
    };
}

export function requireRdsLicenseModel(
    name: string,
    licenseModel: Iterable<
        "license-included" | "bring-your-own-license" | "general-public-license"
    >,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    const types = utils.toStringSet(licenseModel);
    return {
        name: name,
        description: `RDS license type should be ${licenseModel}`,
        enforcementLevel: enforcementLevel,
        validateResource: [
            validateResourceOfType(
                aws.rds.Instance,
                (instance, args, reportViolation) => {
                    if (
                        instance.licenseModel == undefined ||
                        (instance.licenseModel !== undefined &&
                            !types.has(instance.licenseModel))
                    ) {
                        reportViolation(
                            `RDS license type should be ${licenseModel}`
                        );
                    }
                }
            ),
        ],
    };
}
//Volume Size -- future
