// Copyright 2016-2023, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface AccountPermissionsArgs {
    automationUser: aws.iam.User;
    managementAccountId: pulumi.Output<string>;
    /**
     * The prefix to use when naming child resources in this component.
     */
    resourceNamesPrefix: string;
}

/**
 * Creates roles in the target account so that developers
 * and automation users can operate in the account with
 * limited permissions.
 */
export class AccountPermissions extends pulumi.ComponentResource {
    public static readonly nonAutomationUserAssumeRoleName = "DeveloperRole";
    public static readonly automationUserAssumeRoleName = "AutomationRole";

    private prefix: string;
    private automationUser: aws.iam.User;
    private managementAccountId: pulumi.Output<string>;

    constructor(
        name: string,
        args: AccountPermissionsArgs,
        opts: pulumi.ComponentResourceOptions,
    ) {
        if (!opts.provider) {
            throw new Error("Provider resource option is required");
        }

        super("acme:permissions:AccountPermissions", name, undefined, opts);

        this.prefix = args.resourceNamesPrefix;
        this.automationUser = args.automationUser;
        this.managementAccountId = args.managementAccountId;

        this.createRole();
        this.createAutomationRole();

        super.registerOutputs();
    }

    private createRole() {
        const devActions = ["s3:*", "cloudwatch:*", "dynamodb:*", "ec2:*"];
        const permissionsBoundary = new aws.iam.Policy(
            `${this.prefix}DevBoundary`,
            {
                policy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: devActions,
                            Resource: "*",
                        },
                    ],
                },
            },
            { parent: this },
        );

        // Create a role that users can assume into the provided account.
        // The role should allow them to use compute, storage and messaging services.
        const role = new aws.iam.Role(
            `${this.prefix}DevRole`,
            {
                name: AccountPermissions.nonAutomationUserAssumeRoleName,
                assumeRolePolicy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: {
                                // This allows any user in the management account to assume this role.
                                // However, only users belonging to an appropriate IAM group will even
                                // have permissions to perform an sts:AssumeRole action.
                                AWS: pulumi.interpolate`arn:aws:iam::${this.managementAccountId}:root`,
                            },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
                permissionsBoundary: permissionsBoundary.arn,
            },
            { parent: this },
        );

        const attachment = new aws.iam.RolePolicyAttachment(
            `${this.prefix}RPAttach`,
            {
                policyArn: permissionsBoundary.arn,
                role: role,
            },
            { parent: this },
        );
    }

    private createAutomationRole() {
        const actions = [
            "s3:*",
            "cloudwatch:*",
            "ec2:*",
            "dynamodb:*",
            "iam:*",
        ];
        const permissionsBoundary = new aws.iam.Policy(
            `${this.prefix}AutomationUserBoundary`,
            {
                policy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: actions,
                            Resource: "*",
                        },
                    ],
                },
            },
            { parent: this },
        );

        // The automation role allows an automation IAM user to assume role into this
        // account and manage AWS resources.
        const automationRole = new aws.iam.Role(
            `${this.prefix}AutomationUserRole`,
            {
                name: AccountPermissions.automationUserAssumeRoleName,
                assumeRolePolicy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: {
                                AWS: this.automationUser.arn,
                            },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
                permissionsBoundary: permissionsBoundary.arn,
            },
            { parent: this },
        );

        const attachment = new aws.iam.RolePolicyAttachment(
            `${this.prefix}UserPolicyAttach`,
            {
                policyArn: permissionsBoundary.arn,
                role: automationRole,
            },
            { parent: this },
        );
    }
}
