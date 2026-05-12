// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

new PolicyPack("multi-nic-vm-policies", {
    policies: [
        {
            name: "require-can-ip-forward-on-multi-nic",
            description:
                "A VM with more than one NIC must set canIpForward = true so the kernel can route between its interfaces.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (instance, _args, reportViolation) => {
                if ((instance.networkInterfaces?.length ?? 0) > 1 && !instance.canIpForward) {
                    reportViolation(
                        `Instance has ${instance.networkInterfaces.length} NICs but canIpForward is not set. ` +
                            "Multi-NIC VMs must enable IP forwarding.",
                    );
                }
            }),
        },
        {
            name: "require-gvnic",
            description: "All NICs must use the GVNIC driver for performance and parity.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (instance, _args, reportViolation) => {
                instance.networkInterfaces?.forEach((nic, i) => {
                    if (nic.nicType !== "GVNIC") {
                        reportViolation(`NIC ${i} uses nicType "${nic.nicType ?? "default"}" — must be "GVNIC".`);
                    }
                });
            }),
        },
        {
            name: "require-dedicated-service-account",
            description: "VMs must use a dedicated service account, not the default Compute SA.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (instance, _args, reportViolation) => {
                const email = instance.serviceAccount?.email ?? "";
                if (!email || /-compute@developer\.gserviceaccount\.com$/.test(email)) {
                    reportViolation(
                        `Instance is using the default Compute service account (${email || "unset"}). ` +
                            "Attach a dedicated, least-privilege service account instead.",
                    );
                }
            }),
        },
        {
            name: "limit-public-nics",
            description: "At most one NIC on a VM may have a public (access-config) IP.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Instance, (instance, _args, reportViolation) => {
                let publicCount = 0;
                instance.networkInterfaces?.forEach((nic) => {
                    if ((nic.accessConfigs?.length ?? 0) > 0) {
                        publicCount++;
                    }
                });
                if (publicCount > 1) {
                    reportViolation(`Instance has ${publicCount} public NICs; the limit is 1.`);
                }
            }),
        },
        {
            name: "no-public-firewall-ingress",
            description: "Firewall rules must not allow ingress from 0.0.0.0/0.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(gcp.compute.Firewall, (firewall, _args, reportViolation) => {
                if (firewall.direction !== "EGRESS" && firewall.sourceRanges?.includes("0.0.0.0/0")) {
                    reportViolation(
                        "Firewall allows ingress from 0.0.0.0/0; use IAP (35.235.240.0/20) or a specific CIDR.",
                    );
                }
            }),
        },
    ],
});
