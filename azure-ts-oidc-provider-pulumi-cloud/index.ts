// Copyright 2023, Pulumi Corporation.
import * as authorization from "@pulumi/azure-native/authorization";
import * as resources from "@pulumi/azure-native/resources";
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";

import { randomInt } from "crypto";
import * as yaml from "yaml";

// Generate a random number
const randomNumber = randomInt(1000, 9999);

// Retrieve local Pulumi configuration
const pulumiConfig = new pulumi.Config();
const issuer = pulumiConfig.get("issuer") || "https://api.pulumi.com/oidc";
const orgName = pulumi.getOrganization();
const audience = `azure:${orgName}`;
const projectName = pulumiConfig.require("projectName");
const envName = pulumiConfig.require("environmentName");

// Retrieve local Azure configuration
const azureConfig = authorization.getClientConfig();
const azSubscription = azureConfig.then(config => config.subscriptionId);
const tenantId = azureConfig.then(config => config.tenantId);

// Create a Microsoft Entra Application
const application = new azuread.Application(`pulumi-oidc-app-reg-${randomNumber}`, {
    displayName: "pulumi-environments-oidc-app",
    signInAudience: "AzureADMyOrg",
});

// Create Federated Credentials - one for ESC and one for IAC
// Known issue with the value of the subject identifier
// Refer to: https://github.com/pulumi/pulumi/issues/14509
const subject = pulumi.interpolate`pulumi:environments:org:${orgName}:env:${projectName}/${envName}`;

const federatedIdentityCredential = new azuread.ApplicationFederatedIdentityCredential("federatedIdentityCredential", {
    applicationId: application.objectId.apply(objectId => `/applications/${objectId}`),
    displayName: `pulumi-env-oidc-fic-${randomNumber}`,
    description: "Federated credentials for Pulumi ESC",
    audiences: [audience],
    issuer: issuer,
    subject: subject,
});

const subjectIac = pulumi.interpolate`pulumi:environments:org:${orgName}:env:<yaml>`;

const federatedIdentityCredentialIac = new azuread.ApplicationFederatedIdentityCredential("federatedIdentityCredentialIac", {
    applicationId: application.objectId.apply(objectId => `/applications/${objectId}`),
    displayName: `pulumi-env-oidc-fic-${randomNumber}-2`,
    description: "Federated credentials for Pulumi ESC",
    audiences: [audience],
    issuer: issuer,
    subject: subjectIac,
});

// Create a Service Principal
const servicePrincipal = new azuread.ServicePrincipal("myserviceprincipal", {
  clientId: application.clientId,
});

// Assign the "Contributor" role to the Service principal
const CONTRIBUTOR = pulumi.interpolate`/subscriptions/${azSubscription}/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c`;

const roleAssignment = new authorization.RoleAssignment("myroleassignment", {
    roleDefinitionId: CONTRIBUTOR,
    principalId: servicePrincipal.objectId,
    principalType: "ServicePrincipal",
    scope: pulumi.interpolate`/subscriptions/${azSubscription}`,
});

function createESCEnvironment(args: [string, string, string]) {
    const [clientId, tenantId, subscriptionId] = args;

    const envYaml = pulumi.interpolate`
values:
  azure:
    login:
      fn::open::azure-login:
        clientId: ${clientId}
        tenantId: ${tenantId}
        subscriptionId: ${subscriptionId}
        oidc: true
  environmentVariables:
    ARM_USE_OIDC: 'true'
    ARM_CLIENT_ID: \${azure.login.clientId}
    ARM_TENANT_ID: \${azure.login.tenantId}
    ARM_OIDC_TOKEN: \${azure.login.oidc.token}
    ARM_SUBSCRIPTION_ID: \${azure.login.subscriptionId}
    `;

    // tslint:disable-next-line:no-unused-expression
    new pulumiservice.Environment("aws-esc-oidc-env", {
        organization: orgName,
        project: projectName,
        name: envName,
        yaml: envYaml.apply(yaml => new pulumi.asset.StringAsset(yaml)),
    });
}

pulumi.all([application.clientId, tenantId, azSubscription]).apply(createESCEnvironment);

export const escEnvironment = pulumi.interpolate`${projectName}/${envName}`;
