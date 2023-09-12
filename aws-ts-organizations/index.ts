// Copyright 2016-2023, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { AccountPermissions } from "./accountPermissions";
import { BackupPolicy } from "./backupPolicy";
import { TagPolicies } from "./tagPolicy";

const config = new pulumi.Config();

// If you've already created an organization in your root account
// and don't want it managed by Pulumi then simply retrieve it
// using the `getOrganization` function.
const organization = aws.organizations.getOrganization({});
const orgId = organization.then(o => o.roots[0].id);

// Otherwise, create an organization and let Pulumi manage it.
// If you are going to create the organization using the following
// construction, you should remove the call to getOrganization above.
//
// const organization = new aws.organizations.Organization("org");
// const orgId = organization.roots.apply(rs => rs[0].id);

// The IAM user used to execute this Pulumi app should be granted
// permissions to assume this role in any account.
// This role is automatically created in every new account
// created in an Organization. The name
// `OrganizationalAccountAccessRole` is the default name.
// You may choose a different name.
// https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html
const initialRoleName = "OrganizationalAccountAccessRole";
// TODO: Be sure to enter the email alias who should be the primary contact
// for the new AWS account.
const devAccountEmailContact = config.requireSecret("devAccountEmailContact");

if (!devAccountEmailContact) {
    throw new Error("An email alias for the dev account is required");
}

const devOrgUnit = new aws.organizations.OrganizationalUnit("orgUnit", {
    parentId: orgId,
    name: "Development",
});

const devAccount = new aws.organizations.Account(
    "devAccount",
    {
        name: "DeveloperAccount",
        parentId: devOrgUnit.id,
        email: devAccountEmailContact,
        roleName: initialRoleName,
        // IMPORTANT! Set this to `false` if you do not wish to have
        // accounts closed when the account resource is removed from
        // your Pulumi app.
        closeOnDeletion: true,
    },
    // This flag tells Pulumi to protect this resource from being deleted
    // during a `pulumi destroy` operation. It also means you need to
    // first unprotect it if you do wish to delete it using Pulumi.
    // https://www.pulumi.com/docs/intro/concepts/resources/options/protect/
    { protect: true },
);

// Setup a dev IAM group with permissions to assume roles in
// sub-accounts.
const devGroup = new aws.iam.Group("developers", {
    name: "developers",
});

const groupPolicy = new aws.iam.GroupPolicy("developersGroupPolicy", {
    group: devGroup.name,
    policy: {
        Statement: [
            {
                Effect: "Allow",
                Action: "sts:AssumeRole",
                Resource: `arn:aws:iam::*:role/${AccountPermissions.nonAutomationUserAssumeRoleName}`,
            },
        ],
        Version: "2012-10-17",
    },
});

// Create an automation user so that you can run all other Pulumi
// infrastructure apps using this identity in your CI/CD service.
const automationUser = new aws.iam.User("automationUser", {
    name: "cicd-automation",
});

const userPolicy = new aws.iam.UserPolicy("automationUserPolicy", {
    policy: {
        Statement: [
            {
                Effect: "Allow",
                Action: "sts:AssumeRole",
                Resource: `arn:aws:iam::*:role/${AccountPermissions.automationUserAssumeRoleName}`,
            },
        ],
        Version: "2012-10-17",
    },
    user: automationUser.name,
});

// We need to create permissions in the newly-created
// dev account so that developers can assume role into that
// account.

// Since we are talking about creating those permissions in an
// account that is different from the current account that this
// currently set in the environment, we should create an explicit
// provider that assumes role into that target account using the
// initial role name that we provided to the account when it was
// created.
const devAccountProvider = new aws.Provider("devAccountProvider", {
    allowedAccountIds: [devAccount.id],
    assumeRole: {
        roleArn: pulumi.interpolate`arn:aws:iam::${devAccount.id}:role/${initialRoleName}`,
    },
});

// Create the permissions in the target account so that developers
// and the automation IAM user can assume role into it.
const devAccountPermissions = new AccountPermissions(
    "devAccountPermissions",
    {
        automationUser,
        managementAccountId: pulumi.Output.create(
            aws.getCallerIdentity().then((i) => i.accountId),
        ),
        resourceNamesPrefix: "dev",
    },
    { provider: devAccountProvider },
);

// Lastly, setup the tagging and backup policies
// for the new OU.
const tagPolicies = new TagPolicies("tagPolicies", {
    costCenters: [
        {
            allowedCostCenters: ["Development", "Testing"],
            ou: devOrgUnit,
        },
    ],
    orgId: orgId,
});

const backupPolicy = new BackupPolicy("developmentBackupPolicy", {
    assumeRoleName: initialRoleName,
    accounts: { devAccount },
    backupRegion: aws.USEast1Region,
    primaryRegions: [aws.USWest2Region],
    orgUnitId: devOrgUnit.id,
});
