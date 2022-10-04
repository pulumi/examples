// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

const policies = new PolicyPack("azure", {
    policies: [
        {
            name: "discouraged-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(azure.network.NetworkInterface, (ni, args, reportViolation) => {
                if (ni.ipConfigurations.some(cfg => cfg.publicIpAddressId)) {
                    reportViolation("Associating public IP addresses is discouraged.");
                }
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Inbound rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(azure.network.NetworkSecurityRule, (securityRule, args, reportViolation) => {
                if (securityRule.sourceAddressPrefix === "*") {
                    reportViolation("Inbound rules with public internet access are prohibited.");
                }
            }),
        },
        {
            name: "prohibited-iot",
            description: "Use of IOT services is prohibited.",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type.startsWith("azure:iot")) {
                    reportViolation("Use of IOT services is prohibited.");
                }
            },
        },
    ],
});
