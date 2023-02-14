// Copyright 2016-2023, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Provider } from "@pulumi/aws";

interface BackupPolicyArgs {
    backupRegion: aws.Region;
    primaryRegions: aws.Region[];
    orgUnitId: pulumi.Input<string>;
    /**
     * A map of the accounts with the `key` being a short-name
     * for the account and the `value` is the account resource.
     */
    accounts: { [key: string]: aws.organizations.Account };
    assumeRoleName: string;
}

/**
 * Creates a backup policy for the organizational unit (OU).
 * This component also creates backup vaults in each of the
 * target accounts that the backup policy requires.
 */
export class BackupPolicy extends pulumi.ComponentResource {
    accounts: { [key: string]: aws.organizations.Account };
    assumeRoleName: string;
    /**
     * Region where the backup should be copied to.
     * This is also sometimes known as the secondary
     * backup region. The primary is wherever the
     * resource being backed up lives. AWS Backup
     * calls this the "copy" region.
     */
    backupRegion: aws.Region;
    orgUnitId: pulumi.Input<string>;
    primaryRegions: aws.Region[];

    monthlyBackupPolicyIamRoleName = "MyMonthlyBackupIamRole";

    constructor(
        name: string,
        args: BackupPolicyArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("acme:policies:BackupPolicy", name, undefined, opts);

        this.accounts = args.accounts;
        this.assumeRoleName = args.assumeRoleName;
        this.backupRegion = args.backupRegion;
        this.orgUnitId = args.orgUnitId;
        this.primaryRegions = args.primaryRegions;

        for (const accountName of Object.keys(args.accounts)) {
            const account = args.accounts[accountName];
            const accountProvider = new aws.Provider(
                `${accountName}Provider`,
                {
                    assumeRole: {
                        roleArn: pulumi.interpolate`arn:aws:iam::${account.id}:role/${this.assumeRoleName}`,
                    },
                    allowedAccountIds: [account.id],
                },
                { parent: this },
            );

            this.createBackupVault(accountName, accountProvider);

            this.createBackupPolicyIamRole(accountName, accountProvider);
        }

        this.createMonthlyBackupPolicy();

        super.registerOutputs();
    }

    /**
     * Creates a backup vault in the copy region.
     */
    private createBackupVault(accountName: string, accountProvider: Provider) {
        const vault = new aws.backup.Vault(
            `backupVault-${accountName}`,
            // We rely on the vault name staying consistent across AWS accounts
            // for the purposes of the backup policy that is attached to the
            // organizational unit.
            { name: "Default" },
            { provider: accountProvider, parent: this },
        );
    }

    private createBackupPolicyIamRole(
        accountName: string,
        accountProvider: Provider,
    ) {
        const backupPolicyRole = new aws.iam.Role(
            `${accountName}BackupPolicyRole`,
            {
                name: "MyMonthlyBackupIamRole",
                assumeRolePolicy: {
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: "sts:AssumeRole",
                            Principal: {
                                Service: "backup.amazonaws.com",
                            },
                        },
                    ],
                    Version: "2012-10-17",
                },
                managedPolicyArns: [
                    "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup",
                ],
            },
            { provider: accountProvider, parent: this },
        );
    }

    /**
     * Creates a backup policy at the organizational unit-level
     * that targets resources that have the tag `BackupType`
     * equal to `MONTHLY`.
     */
    private createMonthlyBackupPolicy() {
        const content = this.getMonthlyBackupPolicyJson();

        const backupPolicy = new aws.organizations.Policy(
            "orgBackupPolicy",
            {
                type: "BACKUP_POLICY",
                content,
            },
            { parent: this },
        );

        const attachment = new aws.organizations.PolicyAttachment(
            "orgBackupPolicyAttachment",
            {
                policyId: backupPolicy.id,
                targetId: this.orgUnitId,
            },
            { parent: this },
        );
    }

    /**
     * https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_syntax.html
     * @returns stringified-JSON of a backup policy document.
     */
    private getMonthlyBackupPolicyJson(): string {
        const backupVaultCopyAction: any = {};
        backupVaultCopyAction[
            `arn:aws:backup:${this.backupRegion}:$account:backup-vault:Default`
        ] = {
            target_backup_vault_arn: {
                "@@assign": `arn:aws:backup:${this.backupRegion}:$account:backup-vault:Default`,
            },
            lifecycle: {
                move_to_cold_storage_after_days: {
                    "@@assign": "30",
                },
                delete_after_days: {
                    "@@assign": "365",
                },
            },
        };

        return JSON.stringify({
            plans: {
                Monthly_Backup_Plan: {
                    regions: {
                        "@@assign": this.primaryRegions,
                    },
                    rules: {
                        Monthly: {
                            schedule_expression: {
                                "@@assign": "cron(0 5 1 * ? *)",
                            },
                            start_backup_window_minutes: { "@@assign": "480" },
                            target_backup_vault_name: { "@@assign": "Default" },
                            lifecycle: {
                                move_to_cold_storage_after_days: {
                                    "@@assign": "30",
                                },
                                delete_after_days: { "@@assign": "365" },
                            },
                            copy_actions: backupVaultCopyAction,
                        },
                    },
                    selections: {
                        tags: {
                            Backup_Assignment: {
                                iam_role_arn: {
                                    "@@assign": `arn:aws:iam::$account:role/${this.monthlyBackupPolicyIamRoleName}`,
                                },
                                tag_key: { "@@assign": "BackupType" },
                                tag_value: { "@@assign": ["MONTHLY"] },
                            },
                        },
                    },
                },
            },
        });
    }
}
