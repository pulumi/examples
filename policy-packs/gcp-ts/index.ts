// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

const policies = new PolicyPack("gcp", {
    policies: [
        {
            name: "discouraged-gcp-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (instance, args, reportViolation) => {
                if (instance.networkInterfaces.some(net => net.accessConfigs)) {
                    reportViolation("Associating public IP addresses is discouraged.");
                }
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Ingress rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Firewall, (firewall, args, reportViolation) => {
                if (firewall.sourceRanges?.some(ranges => ranges === "0.0.0.0/0")) {
                    reportViolation("Ingress rules with public internet access are prohibited.");
                }
            }),
        },
        {
            name: "prohibited-bigtable",
            description: "Use of Bigtable is prohibited.",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type.startsWith("gcp:bigtable")) {
                    reportViolation("Use of Bigtable is prohibited.");
                }
            },
        },
    ],
});
