import * as azure from "@pulumi/azure";
import { PolicyPack, validateTypedResource } from "@pulumi/policy";
import * as assert from "assert";

const policies = new PolicyPack("azure", {
    policies: [
        {
            name: "discouraged-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateTypedResource(azure.network.NetworkInterface.isInstance, (ni, args, reportViolation) => {
                const publicIpAssociations = ni.ipConfigurations.find(cfg => cfg.publicIpAddressId !== undefined);
                if (publicIpAssociations !== undefined) {
                    reportViolation("Associating public IP addresses is discouraged.");
                }
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Inbound rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateTypedResource(azure.network.NetworkSecurityRule.isInstance, (securityRule, args, reportViolation) => {
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
