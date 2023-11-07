// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

// Create a resource group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup");

// Create a storage account for Blobs
const storageAccount = new azure.storage.Account("storage", {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
});

// The container to put our files into
const storageContainer = new azure.storage.Container("files", {
    storageAccountName: storageAccount.name,
    containerAccessType: "private",
});

// Azure SQL Server that we want to access from the application
const administratorLoginPassword = new random.RandomPassword("password", { length: 16, special: true }).result;
const sqlServer = new azure.sql.SqlServer("sqlserver", {
    resourceGroupName: resourceGroup.name,
    // The login and password are required but won't be used in our application
    administratorLogin: "manualadmin",
    administratorLoginPassword,
    version: "12.0",
});

// Azure SQL Database that we want to access from the application
const database = new azure.sql.Database("sqldb", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    requestedServiceObjectiveName: "S0",
});

// The connection string that has no credentials in it: authertication will come through MSI
const connectionString = pulumi.interpolate`Server=tcp:${sqlServer.name}.database.windows.net;Database=${database.name};`;

// A file in Blob Storage that we want to access from the application
const textBlob = new azure.storage.Blob("text", {
    storageAccountName: storageAccount.name,
    storageContainerName: storageContainer.name,
    type: "Block",
    source: "./README.md",
});

// A plan to host the App Service
const appServicePlan = new azure.appservice.Plan("asp", {
    resourceGroupName: resourceGroup.name,
    kind: "App",
    sku: {
        tier: "Basic",
        size: "B1",
    },
});

// ASP.NET deployment package
const blob = new azure.storage.Blob("zip", {
    storageAccountName: storageAccount.name,
    storageContainerName: storageContainer.name,
    type: "Block",

    source: new pulumi.asset.FileArchive("./webapp/bin/Debug/net6.0/publish"),
});

const clientConfig = azure.core.getClientConfig({ async: true });
const tenantId = clientConfig.then(config => config.tenantId);
const currentPrincipal = clientConfig.then(config => config.objectId);

// Key Vault to store secrets (e.g. Blob URL with SAS)
const vault = new azure.keyvault.KeyVault("vault", {
    resourceGroupName: resourceGroup.name,
    skuName: "standard",
    tenantId: tenantId,
    accessPolicies: [{
        tenantId,
        // The current principal has to be granted permissions to Key Vault so that it can actually add and then remove
        // secrets to/from the Key Vault. Otherwise, 'pulumi up' and 'pulumi destroy' operations will fail.
        objectId: currentPrincipal,
        secretPermissions: ["delete", "get", "list", "set"],
    }],
});

// Put the URL of the zip Blob to KV
const secret = new azure.keyvault.Secret("deployment-zip", {
    keyVaultId: vault.id,
    value: azure.storage.signedBlobReadUrl(blob, storageAccount),
});
const secretUri = pulumi.interpolate`${vault.vaultUri}secrets/${secret.name}/${secret.version}`;

// The application hosted in App Service
const app = new azure.appservice.AppService("app", {
    resourceGroupName: resourceGroup.name,
    appServicePlanId: appServicePlan.id,

    // A system-assigned managed service identity to be used for authentication and authorization to the SQL Database and the Blob Storage
    identity: {
        type: "SystemAssigned",
    },

    appSettings: {
        // Website is deployed from a URL read from the Key Vault
        "WEBSITE_RUN_FROM_ZIP": pulumi.interpolate`@Microsoft.KeyVault(SecretUri=${secretUri})`,

        // Note that we simply provide the URL without SAS or keys
        "StorageBlobUrl": textBlob.url,
    },

    // A SQL connection string, still without secrets in it
    connectionStrings: [{
        name: "db",
        value: connectionString,
        type: "SQLAzure",
    }],
});

// Work around a preview issue https://github.com/pulumi/pulumi-azure/issues/192
const principalId = app.identity.apply(id => id.principalId || "11111111-1111-1111-1111-111111111111");

// Grant App Service access to KV secrets
const policy = new azure.keyvault.AccessPolicy("app-policy", {
    keyVaultId: vault.id,
    tenantId: tenantId,
    objectId: principalId,
    secretPermissions: ["get"],
});

// Make the App Service the admin of the SQL Server (double check if you want a more fine-grained security model in your real app)
const sqlAdmin = new azure.sql.ActiveDirectoryAdministrator("adadmin", {
    resourceGroupName: resourceGroup.name,
    tenantId: tenantId,
    objectId: principalId,
    login: "adadmin",
    serverName: sqlServer.name,
});

// Grant access from App Service to the container in the storage
const blobPermission = new azure.role.Assignment("readblob", {
    principalId,
    scope: pulumi.interpolate`${storageAccount.id}/blobServices/default/containers/${storageContainer.name}`,
    roleDefinitionName: "Storage Blob Data Reader",
});

// Add SQL firewall exceptions
const firewallRules = app.outboundIpAddresses.apply(
    ips => ips.split(",").map(
        ip => new azure.sql.FirewallRule(`FR${ip}`, {
            resourceGroupName: resourceGroup.name,
            startIpAddress: ip,
            endIpAddress: ip,
            serverName: sqlServer.name,
        }),
    ));

export const endpoint = pulumi.interpolate `https://${app.defaultSiteHostname}`;
