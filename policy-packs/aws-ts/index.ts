// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { PolicyPack, ReportViolation, validateResourceOfType } from "@pulumi/policy";

const policies = new PolicyPack("aws", {
    policies: [
        {
            name: "discouraged-ec2-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(aws.ec2.Instance, (instance, args, reportViolation) => {
                if (instance.associatePublicIpAddress) {
                    reportViolation("Consider not setting associatePublicIpAddress to true.");
                }
            }),
        },
        {
            name: "required-name-tag",
            description: "A 'Name' tag is required.",
            enforcementLevel: "mandatory",
            validateResource: [
                validateResourceOfType(aws.ec2.Instance, (instance, args, reportViolation) => {
                    requireNameTag(instance.tags, reportViolation);
                }),
                validateResourceOfType(aws.ec2.Vpc, (vpc, args, reportViolation) => {
                    requireNameTag(vpc.tags, reportViolation);
                }),
            ],
        },
        {
            name: "prohibited-public-internet",
            description: "Ingress rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.ec2.SecurityGroup, (sg, args, reportViolation) => {
                const publicInternetRules = (sg.ingress || []).find(ingressRule =>
                    (ingressRule.cidrBlocks || []).find(cidr => cidr === "0.0.0.0/0"));
                if (publicInternetRules) {
                    reportViolation("Ingress rules with public internet access are prohibited.");
                }
            }),
        },
        {
            name: "prohibited-elasticbeanstalk",
            description: "Use of Elastic Beanstalk is prohibited.",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type.startsWith("aws:elasticbeanstalk")) {
                    reportViolation("Use of Elastic Beanstalk is prohibited.");
                }
            },
        },
    ],
});

function requireNameTag(tags: any, reportViolation: ReportViolation) {
    if ((tags || {})["Name"] === undefined) {
        reportViolation("A 'Name' tag is required.");
    }
}
