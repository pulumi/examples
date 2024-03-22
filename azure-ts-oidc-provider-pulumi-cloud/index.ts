// Copyright 2023, Pulumi Corporation.
import * as authorization from "@pulumi/azure-native/authorization";
import * as resources from "@pulumi/azure-native/resources";
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";

import { randomInt } from "crypto";
import * as yaml from "yaml";

// Generate a random number
const randomNumber = randomInt(1000, 9999);

const issuer = "https://api.pulumi.com/oidc";

// Retrieve local Pulumi configuration
const pulumiConfig = new pulumi.Config();
const audience = pulumi.getOrganization();
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

// Create Federated Credentials
// Known issue with the value of the subject identifier
// Refer to: https://github.com/pulumi/pulumi/issues/14509
const subject = pulumi.interpolate`pulumi:environments:org:${audience}:env:<yaml>`;

const federatedIdentityCredential = new azuread.ApplicationFederatedIdentityCredential("federatedIdentityCredential", {
    applicationId: application.objectId.apply(objectId => `/applications/${objectId}`),
    displayName: `pulumi-env-oidc-fic-${randomNumber}`,
    description: "Federated credentials for Pulumi ESC",
    audiences: [audience],
    issuer: issuer,
    subject: subject,
});

// Create a Service Principal
const servicePrincipal = new azuread.ServicePrincipal("myserviceprincipal", {
    clientId: application.applicationId,
});

// Assign the "Contributor" role to the Service principal
const CONTRIBUTOR = pulumi.interpolate`/subscriptions/${azSubscription}/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c`;

const roleAssignment = new authorization.RoleAssignment("myroleassignment", {
    roleDefinitionId: CONTRIBUTOR,
    principalId: servicePrincipal.id,
    principalType: "ServicePrincipal",
    scope: pulumi.interpolate`/subscriptions/${azSubscription}`,
});

console.log("OIDC configuration complete!");
console.log("Copy and paste the following template into your Pulumi ESC environment:");
console.log("--------");

function createYamlStructure(args: [string, string, string]) {
    const [clientId, tenantId, subscriptionId] = args;
    return {
        values: {
            azure: {
                login: {
                    "fn::open::azure-login": {
                        clientId,
                        tenantId,
                        subscriptionId,
                        oidc: true,
                    },
                },
            },
            environmentVariables: {
                ARM_USE_OIDC: "true",
                ARM_CLIENT_ID: "${azure.login.clientId}",
                ARM_TENANT_ID: "${azure.login.tenantId}",
                // ARM_OIDC_REQUEST_TOKEN: "${azure.login.oidc.token}",
                // ARM_OIDC_REQUEST_URL: "https://api.pulumi.com/oidc",
                /*
                You must set either the ARM_OIDC_REQUEST_TOKEN and ARM_OIDC_REQUEST_URL
                variables OR the ARM_OIDC_TOKEN variable. Use the former pair of variables
                if your identity provider does not offer an ID token directly
                but it does offer a way to exchange a local bearer token for an
                ID token.
                */
                ARM_OIDC_TOKEN: "${azure.login.oidc.token}",
                ARM_SUBSCRIPTION_ID: "${azure.login.subscriptionId}",
            },
        },
    };
}

function printYaml(args: [string, string, string]) {
    const yamlStructure = createYamlStructure(args);
    const yamlString = yaml.stringify(yamlStructure);
    console.log(yamlString);
}

pulumi.all([application.clientId, tenantId, azSubscription]).apply(printYaml);
