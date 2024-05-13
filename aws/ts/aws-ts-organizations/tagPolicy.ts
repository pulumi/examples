// Copyright 2016-2023, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { ComponentResourceOptions } from "@pulumi/pulumi";

interface OrgUnitCostCenter {
    /**
     * The list of allowed cost centers for the OU.
     */
    allowedCostCenters: string[];
    ou: aws.organizations.OrganizationalUnit;
}

interface TagPoliciesArgs {
    /**
     * The organization to which a parent tag policy will
     * be created and attached. This tag policy generally
     * enforces the case treatment (aka case-sensitivity)
     * of the tag.
     */
    orgId: pulumi.Input<string>;
    /**
     * The list of OUs and their cost centers for which
     * the child tag policy should be created.
     */
    costCenters: OrgUnitCostCenter[];
}

export class TagPolicies extends pulumi.ComponentResource {
    private orgId: pulumi.Input<string>;
    private costCenters: OrgUnitCostCenter[];

    constructor(
        name: string,
        args: TagPoliciesArgs,
        opts?: ComponentResourceOptions,
    ) {
        super("acme:policies:TagPolicy", name, undefined, opts);

        this.orgId = args.orgId;
        this.costCenters = args.costCenters;

        this.createOrgTagPolicy();
        this.createTagPolicyForOrgUnits();
        super.registerOutputs();
    }

    private createOrgTagPolicy() {
        // Using the child control operator
        // `@@operators_allowed_for_child_policies` prevents
        // tag policies in child organizations from changing
        // the tag key. It effectively locks the tag key and
        // its case treatment.
        const orgTagPolicy = new aws.organizations.Policy(
            "orgTagPolicy",
            {
                type: "TAG_POLICY",
                content: JSON.stringify({
                    tags: {
                        CostCenter: {
                            tag_key: {
                                "@@assign": "CostCenter",
                                "@@operators_allowed_for_child_policies": [
                                    "@@none",
                                ],
                            },
                        },
                    },
                }),
            },
            { parent: this },
        );

        const attachment = new aws.organizations.PolicyAttachment(
            "orgTagPolicyAttachment",
            {
                policyId: orgTagPolicy.id,
                targetId: this.orgId,
            },
            { parent: this },
        );
    }

    private createTagPolicyForOrgUnits() {
        this.costCenters.forEach(this.createOrgUnitTagPolicy);
    }

    /**
     * Creates a tag policy per OU.
     */
    private createOrgUnitTagPolicy(costCenter: OrgUnitCostCenter) {
        costCenter.ou.name.apply((name) => {
            const orgTagPolicy = new aws.organizations.Policy(
                `${name}TagPolicy`,
                {
                    type: "TAG_POLICY",
                    content: JSON.stringify({
                        tags: {
                            CostCenter: {
                                tag_value: {
                                    "@@assign": costCenter.allowedCostCenters,
                                },
                            },

                            // Add tags that are enforceable only to the OU.
                            Owner: {
                                tag_key: {
                                    "@@assign": "Owner",
                                    // Don't allow any child policies from changing the key of this tag.
                                    "@@operators_allowed_for_child_policies": [
                                        "@@none",
                                    ],
                                },
                            },
                        },
                    }),
                },
                { parent: this },
            );

            const attachment = new aws.organizations.PolicyAttachment(
                `${name}TagPolicyAttachment`,
                {
                    policyId: orgTagPolicy.id,
                    targetId: costCenter.ou.id,
                },
                { parent: this },
            );
        });
    }
}
