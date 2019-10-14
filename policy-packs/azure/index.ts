import * as azure from "@pulumi/azure";
import { PolicyPack, typedRule } from "@pulumi/policy";
import * as assert from "assert";

const policies = new PolicyPack("azure", {
    policies: [
        {
            name: "discouraged-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            rules: typedRule(azure.network.NetworkInterface.isInstance, it => {
                const publicIpAssociations = it.ipConfigurations.find(cfg => cfg.publicIpAddressId !== undefined);
                assert(publicIpAssociations === undefined);
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Inbound rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            rules: typedRule(azure.network.NetworkSecurityRule.isInstance, it => {
                assert(it.sourceAddressPrefix !== "*");
            }),
        },
        {
            name: "prohibited-iot",
            description: "Use of IOT services is prohibited.",
            enforcementLevel: "mandatory",
            rules: (type: string) => {
                assert(type.startsWith("azure:iot") === false);
            },
        },
    ],
});
