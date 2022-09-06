// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import {
    PolicyPack,
    validateResourceOfType,
    PolicyPackArgs,
} from "@pulumi/policy";
import * as ec2Compute from "./ec2Compute";
import * as cloudWatch from "./cloudwatch";
import * as rds from "./rds";
import * as s3 from "./s3";
import * as vpc from "./vpc";
import * as pulumi from "@pulumi/pulumi";
const requiredRegion = "us-west-2";
const stack = pulumi.getStack();

const policyPackArgs: PolicyPackArgs = {
    policies: [
        {
            name: "require-region",
            description: "Must use an approved region.",
            enforcementLevel: "advisory",
            configSchema: {
                properties: {
                    allowedRegions: {
                        type: "array",
                        items: { type: "string" },
                        default: [requiredRegion],
                    },
                },
            },
            validateResource: (resource, reportViolation) => {
                if (resource.type !== "pulumi:providers:aws") {
                    return;
                }

                const { allowedRegions } = resource.getConfig<{
                    allowedRegions: string[];
                }>();

                const region = resource.props.region;
                if (allowedRegions.indexOf(region) === -1) {
                    reportViolation(`Region [${region}] is not allowed.`);
                }
            },
        },
    ],
};

//Example of instance types as strings
const requiredInstanceTypes: aws.ec2.InstanceType[] = [
    "t4g.nano",
    "t4g.micro",
    "t4g.small",
    "t4g.medium",
    "t4g.large",
    "t4g.xlarge",
    "t4g.2xlarge",
];

//Example of instance types as type
const requiredRdsBurstTypes: aws.rds.InstanceType[] = [
    aws.rds.InstanceType.T4G_Micro,
    aws.rds.InstanceType.T4G_Small,
    aws.rds.InstanceType.T4G_Medium,
    aws.rds.InstanceType.T4G_Large,
    aws.rds.InstanceType.T4G_XLarge,
    aws.rds.InstanceType.T4G_2XLarge,
];

const instanceTypesWithSavingsPlans: aws.ec2.InstanceType[] = ["m6a.large"];

if (stack == "dev") {
    policyPackArgs.policies.push(
        ...[
            // This is cheapest option sharing the physical hardware
            ec2Compute.requireInstanceTenancy(
                "host-instance-tenancy",
                "DEFAULT"
            ),
            ec2Compute.requireSpotInstance(
                "require-spot-instance",
                "mandatory"
            ),
            ec2Compute.requireInstanceType(
                "t4g-instance-types",
                requiredInstanceTypes,
                "mandatory"
            ),
            ec2Compute.requireEbsVolumeTypeGP3("gp3-volume-types", "mandatory"),
            cloudWatch.requireCloudWatchLogRetention(
                "cloudwatch-retention",
                30,
                "mandatory"
            ),
            rds.requireRdsInstanceType(
                "required-instance-types",
                [aws.rds.InstanceType.T4G_Medium],
                "mandatory"
            ),
            rds.requireRdsVolumesGp2("rds-gp2-volume", "mandatory"),
            rds.requireRdsLicenseModel(
                "rds-license-model",
                ["license-included", "general-public-license"],
                "mandatory"
            ),
            s3.requireBucketLifecycleRules("s3-require-lifecycle", "mandatory"),
            s3.requireSpecificBucketExpirationDays(
                "s3-expire-at-30-days",
                30,
                "advisory"
            ),
            vpc.requireSingleNatGateway("single-nat-gateway", "mandatory"),
        ]
    );
} else if (stack == "uat") {
    policyPackArgs.policies.push(
        ...[
            // This is cheapest option sharing the physical hardware
            ec2Compute.requireInstanceTenancy(
                "host-instance-tenancy",
                "DEFAULT"
            ),
            ec2Compute.requireSpotInstance("require-spot-instance", "advisory"),
            ec2Compute.requireInstanceType(
                "t4g-instance-types",
                requiredInstanceTypes
            ),
            //Advisory because there may be performance testing
            ec2Compute.requireEbsVolumeTypeGP3("gp3-volume-types", "mandatory"),
            cloudWatch.requireCloudWatchLogRetention(
                "cloudwatch-retention",
                60,
                "mandatory"
            ),
            rds.requireRdsInstanceType(
                "required-instance-types",
                requiredRdsBurstTypes,
                "mandatory"
            ),
            s3.requireBucketLifecycleRules("s3-require-lifecycle", "mandatory"),
            s3.requireSpecificBucketExpirationDays(
                "s3-expire-at-30-days",
                30,
                "advisory"
            ),
        ]
    );
} else if (stack == "production") {
    policyPackArgs.policies.push(
        ...[
            ec2Compute.requireInstanceType(
                "savings-plan-instances",
                instanceTypesWithSavingsPlans
            ),
        ]
    );
    cloudWatch.requireCloudWatchLogRetention(
        "cloudwatch-retention",
        90,
        "mandatory"
    );
}
new PolicyPack("aws-typescript", policyPackArgs);
