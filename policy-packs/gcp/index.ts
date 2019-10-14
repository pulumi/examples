import * as gcp from "@pulumi/gcp";
import { PolicyPack, typedRule } from "@pulumi/policy";
import * as assert from "assert";

const policies = new PolicyPack("gcp", {
    policies: [
        {
            name: "discouraged-gcp-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            rules: typedRule(gcp.compute.Instance.isInstance, it => {
                const publicIps = it.networkInterfaces.find(net =>
                    net.accessConfigs !== undefined)
                assert(publicIps === undefined);
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Ingress rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            rules: typedRule(gcp.compute.Firewall.isInstance, it => {
                const publicInternetRules = (it.sourceRanges || []).find(ranges =>
                    ranges === "0.0.0.0/0"
                );
                assert(publicInternetRules === undefined);
            }),
        },
        {
            name: "prohibited-bigtable",
            description: "Use of Bigtable is prohibited.",
            enforcementLevel: "mandatory",
            rules: (type: string) => {
                assert(type.startsWith("gcp:bigtable") === false);
            },
        },
    ],
});
