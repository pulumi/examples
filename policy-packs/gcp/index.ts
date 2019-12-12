import * as gcp from "@pulumi/gcp";
import { PolicyPack, validateTypedResource } from "@pulumi/policy";

const policies = new PolicyPack("gcp", {
    policies: [
        {
            name: "discouraged-gcp-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateTypedResource(gcp.compute.Instance, (instance, args, reportViolation) => {
                const publicIps = instance.networkInterfaces.find(net => net.accessConfigs !== undefined);
                if (publicIps !== undefined) {
                    reportViolation("Associating public IP addresses is discouraged.");
                }
            }),
        },
        {
            name: "prohibited-public-internet",
            description: "Ingress rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            validateResource: validateTypedResource(gcp.compute.Firewall, (firewall, args, reportViolation) => {
                const publicInternetRules = (firewall.sourceRanges || []).find(ranges => ranges === "0.0.0.0/0");
                if (publicInternetRules !== undefined) {
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
