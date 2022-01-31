// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure-native";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

const policies = new PolicyPack("azure", {
    policies: [
        {
            name: "discouraged-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(azure.network.NetworkInterface, (ni, args, reportViolation) => {
                if (ni.ipConfigurations.some(cfg => cfg.publicIPAddress.id)) {
                    reportViolation("Associating public IP addresses is discouraged.");
                }
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Inbound rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(azure.network.SecurityRule, (securityRule, args, reportViolation) => {
                if (securityRule.sourceAddressPrefix === "*") {
                    reportViolation("Inbound rules with public internet access are prohibited.");
                }
            }),
        },
        {
            name: "prohibited-powerbi",
            description: "Use of PowerBI services is prohibited.",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type.startsWith("azure-native:powerbi")) {
                    reportViolation("Use of PowerBI services is prohibited.");
                }
            },
        },
    ],
});
