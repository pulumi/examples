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

export function requireInstanceTenancy(
    name: string,
    tenancy: "DEDICATED" | "HOST" | "DEFAULT",
    imageIds?: string | Iterable<string>,
    hostIds?: string | Iterable<string>
): ResourceValidationPolicy {
    const images = utils.toStringSet(imageIds);
    const hosts = utils.toStringSet(hostIds);

    return {
        name: name,
        description: `Instances with AMIs ${utils.setToString(
            images
        )} or host IDs ${utils.setToString(
            hosts
        )} should use tenancy '${tenancy}'`,
        enforcementLevel: "mandatory",
        validateResource: [
            validateResourceOfType(
                aws.ec2.Instance,
                (instance, args, reportViolation) => {
                    if (
                        hosts !== undefined &&
                        instance.hostId &&
                        hosts.has(instance.hostId)
                    ) {
                        if (instance.tenancy !== tenancy) {
                            reportViolation(
                                `EC2 Instance with host ID '${instance.hostId}' not using tenancy '${tenancy}'.`
                            );
                        }
                    } else if (
                        images !== undefined &&
                        instance.ami !== undefined &&
                        images.has(instance.ami)
                    ) {
                        if (instance.tenancy !== tenancy) {
                            reportViolation(
                                `EC2 Instance with AMI '${instance.ami}' not using tenancy '${tenancy}'.`
                            );
                        }
                    }
                }
            ),
            validateResourceOfType(
                aws.ec2.LaunchConfiguration,
                (lc, args, reportViolation) => {
                    if (images !== undefined && images.has(lc.imageId)) {
                        if (lc.placementTenancy !== tenancy) {
                            reportViolation(
                                `EC2 LaunchConfiguration with image ID '${lc.imageId}' not using tenancy '${tenancy}'.`
                            );
                        }
                    }
                }
            ),
        ],
    };
}

export function requireSpotInstance(
    name: string,
    enforcementLevel: EnforcementLevel
): StackValidationPolicy {
    return {
        name: name,
        description: "EC2 instances should come from SpotInstanceRequest",
        enforcementLevel: enforcementLevel,
        validateStack: (stack, reportViolation) => {
            for (const resource of stack.resources) {
                if (resource.type == "aws:ec2/instance:Instance") {
                    reportViolation(
                        `Instance: , ${resource.name}, must be spot`
                    );
                } else if (
                    resource.type == "aws:ec2/launchTemplate:LaunchTemplate"
                ) {
                    if (
                        !resource.props.hasOwnProperty("instanceMarketOptions")
                    ) {
                        reportViolation(
                            `Launch template, ${resource.name}, must have instanceMarketOptions:marketType set to spot`
                        );
                    }
                } else if (
                    resource.type ==
                    "aws:ec2/launchConfiguration:LaunchConfiguration"
                ) {
                    if (!resource.props.hasOwnProperty("spotPrice")) {
                        reportViolation(
                            `Launch Configuration, ${resource.name}, must have a spot price`
                        );
                    }
                }
            }
        },
    };
}

export function requireInstanceType(
    name: string,
    instanceTypes: aws.ec2.InstanceType | Iterable<aws.ec2.InstanceType>,
    enforcementLevel: EnforcementLevel = "advisory"
): ResourceValidationPolicy {
    const types = utils.toStringSet(instanceTypes);

    return {
        name: name,
        description: "EC2 instances should use approved instance types.",
        enforcementLevel: enforcementLevel,
        validateResource: [
            validateResourceOfType(
                aws.ec2.Instance,
                (instance, args, reportViolation) => {
                    if (
                        instance.instanceType !== undefined &&
                        !types.has(instance.instanceType)
                    ) {
                        reportViolation(
                            "EC2 Instance should use the approved instance types."
                        );
                    }
                }
            ),
            validateResourceOfType(
                aws.ec2.LaunchConfiguration,
                (lc, args, reportViolation) => {
                    if (!types.has(lc.instanceType)) {
                        reportViolation(
                            "EC2 LaunchConfiguration should use the approved instance types."
                        );
                    }
                }
            ),
            validateResourceOfType(
                aws.ec2.LaunchTemplate,
                (lt, args, reportViolation) => {
                    if (!lt.instanceType || !types.has(lt.instanceType)) {
                        reportViolation(
                            "EC2 LaunchTemplate should use the approved instance types."
                        );
                    }
                }
            ),
        ],
    };
}

export function requireEbsVolumesOnEc2Instances(
    name: string
): ResourceValidationPolicy {
    // TODO: Check if EBS volumes are marked for deletion.
    return {
        name: name,
        description: "EBS volumes should be attached to all EC2 instances",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(
            aws.ec2.Instance,
            (instance, args, reportViolation) => {
                if (
                    instance.ebsBlockDevices !== undefined &&
                    instance.ebsBlockDevices.length === 0
                ) {
                    reportViolation(
                        "EC2 Instance should have EBS volumes attached."
                    );
                }
            }
        ),
    };
}

export function requireEbsVolumeTypeGP3(
    name: string,
    enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
    return {
        name: name,
        description: "EBS volumes should be GP3",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(
            aws.ebs.Volume,
            (volume, args, reportViolation) => {
                if (!volume.type == undefined || volume.type !== "gp3") {
                    reportViolation("EBS volumes should be gp3");
                }
            }
        ),
    };
}
