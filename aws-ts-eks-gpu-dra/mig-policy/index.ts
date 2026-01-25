import * as policy from "@pulumi/policy";

// Define which MIG profiles are allowed (small profiles only)
const allowedMigProfiles = ["1g.5gb", "1g.10gb", "2g.10gb", "2g.20gb", "3g.20gb"];

// Large profiles that waste GPU resources for inference workloads
const blockedMigProfiles = ["3g.40gb", "4g.20gb", "4g.40gb", "7g.40gb"];

new policy.PolicyPack("mig-policy", {
    policies: [
        {
            name: "enforce-small-mig-profiles",
            description: "Prevents using large MIG profiles (3g.40gb and above) to maximize GPU utilization for inference workloads",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                const resource = args.props as any;

                // Match both CustomResource and native ResourceClaimTemplate types
                const isResourceClaimTemplate =
                    args.type === "kubernetes:resource.k8s.io/v1:ResourceClaimTemplate" ||
                    (args.type === "kubernetes:apiextensions.k8s.io/v1:CustomResource" &&
                     resource.apiVersion === "resource.k8s.io/v1" &&
                     resource.kind === "ResourceClaimTemplate");

                if (!isResourceClaimTemplate) {
                    return;
                }

                const spec = resource.spec;
                if (!spec?.spec?.devices?.requests) {
                    return;
                }

                for (const request of spec.spec.devices.requests) {
                    const selectors = request.exactly?.selectors || [];
                    for (const selector of selectors) {
                        const expression = selector.cel?.expression;
                        if (!expression) continue;

                        // Check for blocked MIG profiles in the CEL expression
                        for (const blockedProfile of blockedMigProfiles) {
                            if (expression.includes(`"${blockedProfile}"`)) {
                                reportViolation(
                                    `ResourceClaimTemplate '${resource.metadata?.name}' requests ` +
                                    `blocked MIG profile '${blockedProfile}'. ` +
                                    `Only small profiles are allowed: ${allowedMigProfiles.join(", ")}. ` +
                                    `Large profiles waste GPU resources for inference workloads.`
                                );
                            }
                        }
                    }
                }
            },
        },
        {
            name: "require-mig-type-selector",
            description: "Ensures ResourceClaimTemplates explicitly request MIG devices (not full GPUs)",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                const resource = args.props as any;

                // Match both CustomResource and native ResourceClaimTemplate types
                const isResourceClaimTemplate =
                    args.type === "kubernetes:resource.k8s.io/v1:ResourceClaimTemplate" ||
                    (args.type === "kubernetes:apiextensions.k8s.io/v1:CustomResource" &&
                     resource.apiVersion === "resource.k8s.io/v1" &&
                     resource.kind === "ResourceClaimTemplate");

                if (!isResourceClaimTemplate) {
                    return;
                }

                const spec = resource.spec;
                if (!spec?.spec?.devices?.requests) {
                    return;
                }

                for (const request of spec.spec.devices.requests) {
                    const selectors = request.exactly?.selectors || [];
                    let hasMigTypeSelector = false;

                    for (const selector of selectors) {
                        const expression = selector.cel?.expression;
                        if (expression && expression.includes('type == "mig"')) {
                            hasMigTypeSelector = true;
                            break;
                        }
                    }

                    if (!hasMigTypeSelector) {
                        reportViolation(
                            `ResourceClaimTemplate '${resource.metadata?.name}' does not explicitly ` +
                            `request MIG devices. Consider adding 'device.attributes["gpu.nvidia.com"].type == "mig"' ` +
                            `to your CEL expression to ensure you get a MIG partition instead of a full GPU.`
                        );
                    }
                }
            },
        },
    ],
});
