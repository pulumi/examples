// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as armsql from "@azure/arm-sql";
import * as msrestjs from "@azure/ms-rest-js";
import * as authlatest from "@pulumi/azure-nextgen/authorization/latest";
import * as authorization from "@pulumi/azure-nextgen/authorization/v20180101preview";
import * as keyvault from "@pulumi/azure-nextgen/keyvault/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as sql from "@pulumi/azure-nextgen/sql/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

// Create a resource group
const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: "ts-msi-keyvault-rbac",
});

// Create a storage account for Blobs
const storageAccount = new storage.StorageAccount("storage", {
    accountName: "msikeyvaultsa",
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    // This seems to be required even though it is marked optional:
    // error: Code="MissingRequiredAccountProperty" Message="Account property accessTier is required for the request."
    accessTier: storage.AccessTier.Hot,
    kind: storage.Kind.BlobStorage,
});

// The container to put our files into
const storageContainer = new storage.BlobContainer("files", {
    containerName: "files",
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    publicAccess: storage.PublicAccess.None,
});

// Azure SQL Server that we want to access from the application
const administratorLoginPassword = new random.RandomPassword("password", { length: 16, special: true }).result;
const sqlServer = new sql.Server("sqlserver", {
    serverName: "sqlserver122021a",
    resourceGroupName: resourceGroup.name,
    // The login and password are required but won't be used in our application
    administratorLogin: "manualadmin",
    administratorLoginPassword,
    version: "12.0",
});

// Azure SQL Database that we want to access from the application
const database = new sql.Database("sqldb", {
    databaseName: "sqldb",
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    requestedServiceObjectiveName: "S0",
});

// The connection string that has no credentials in it: authertication will come through MSI
const connectionString = pulumi.interpolate`Server=tcp:${sqlServer.name}.database.windows.net;Database=${database.name};`;

// A file in Blob Storage that we want to access from the application
const textBlob = new storage.Blob("text", {
    blobName: "text",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: storageContainer.name,
    type: "Block",
    source: new pulumi.asset.FileAsset("./README.md"),
});

// A plan to host the App Service
const appServicePlan = new web.AppServicePlan("asp", {
    name: "asp",
    resourceGroupName: resourceGroup.name,
    kind: "App",
    sku: {
        tier: "Basic",
        name: "B1",
    },
});

// ASP.NET deployment package
const blob = new storage.Blob("zip", {
    blobName: "zip",
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    containerName: storageContainer.name,
    type: "Block",

    source: new pulumi.asset.FileArchive("./webapp/bin/Debug/netcoreapp3.1/publish"),
});

const clientConfig = authlatest.getClientConfig({ async: true });
const subscriptionId = pulumi.output(clientConfig.then(config => config.subscriptionId));
const tenantId = pulumi.output(clientConfig.then(config => config.tenantId));
const currentPrincipal = clientConfig.then(config => config.objectId);

// The application hosted in App Service
const app = new web.WebApp("app", {
    name: "tsmsikeyvaultrbacapp",
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,

    // A system-assigned managed service identity to be used for authentication and authorization to the SQL Database and the Blob Storage
    identity: {
        type: "SystemAssigned",
    },

    siteConfig: {
        appSettings: [
            // Note that we simply provide the URL without SAS or keys
            { name: "StorageBlobUrl", value: textBlob.url },
        ],
        // A SQL connection string, still without secrets in it
        connectionStrings: [{
            name: "db",
            connectionString: connectionString,
            type: "SQLAzure",
        }],
    },
});

const principalId = app.identity.apply(id => id!.principalId);

// Key Vault to store secrets (e.g. Blob URL with SAS)
const vault = new keyvault.Vault("vault", {
    vaultName: "keyvaultmsirbacts",
    resourceGroupName: resourceGroup.name,
    properties: {
        tenantId: tenantId,
        sku: {
            name: keyvault.SkuName.Standard,
            family: keyvault.SkuFamily.A,
        },
        accessPolicies: [{
            tenantId: tenantId,
            // The current principal has to be granted permissions to Key Vault so that it can actually add and then remove
            // secrets to/from the Key Vault. Otherwise, 'pulumi up' and 'pulumi destroy' operations will fail.
            objectId: currentPrincipal,
            permissions: {
                keys: [keyvault.KeyPermissions.Delete, keyvault.KeyPermissions.Get, keyvault.KeyPermissions.List, keyvault.KeyPermissions.Update, keyvault.KeyPermissions.Create],
            },
        },
        // Grant the application principal access to fetch from keyvault
        {
            tenantId: tenantId,
            objectId: principalId,
            permissions: {
                keys: [keyvault.KeyPermissions.Get],
            },
        }],
    },
});

// Put the URL of the zip Blob in the keyvault
const secret = new keyvault.Secret("deployment-zip", {
    secretName: "deploymentzip",
    vaultName: vault.name,
    resourceGroupName: resourceGroup.name,
    properties: {
        value: signedBlobReadUrl(blob, storageContainer, storageAccount, resourceGroup),
    },
});

// TODO: Not sure this is a fully-qualified id - this might need fixing up
const secretUri = secret.properties.secretUriWithVersion;

// Grant App Service access to KV secrets
const appSetting = new web.WebApplicationSettings("runFrom",
    {
        name: app.name,
        resourceGroupName: resourceGroup.name,
        properties: {
            "WEBSITE_RUN_FROM_ZIP": pulumi.interpolate`@Microsoft.KeyVault(SecretUri=${secretUri})`,
        },
    });


const sid = new random.RandomUuid("sid");
const token = authlatest.getClientToken();

// Use dataplane to create the admin user "adadmin" first
const sqladmin = pulumi.all([resourceGroup.name, subscriptionId, sqlServer.name, tenantId, sid.result, token]).apply(async args => {
    const resourceGroupName = args[0];
    const subId = args[1];
    const serverName = args[2];
    const tenantId = args[3];
    const secureId = args[4];
    const token = args[5];

    const sqlClient = new armsql.SqlManagementClient(new msrestjs.TokenCredentials(token.token), subId);
    const resp = await new armsql.ServerAzureADAdministrators(sqlClient).createOrUpdate(resourceGroupName, serverName, {
        login: "adadmin",
        tenantId: tenantId,
        sid: secureId,
        // fails with this:
        // Error: The requested administrator type: '' is invalid. Please specify a valid value such as "ActiveDirectory"
        // but I see no way to add administratorType here?
    });
    return resp;
});

// This seems to expect the administratorName to point to an existing user.
const _ = new sql.ServerAzureADAdministrator("adadmin", {
    resourceGroupName: resourceGroup.name,
    tenantId: sqladmin.tenantId,
    sid: sqladmin.sid,
    serverName: sqlServer.name,
    administratorType: sql.AdministratorType.ActiveDirectory,
    login: sqladmin.login,
    administratorName: "adadmin",
});

const roleAssignmentId = new random.RandomUuid("uuid");
// Grant access from App Service to the container in the storage
const blobPermission = new authorization.RoleAssignment("readblob", {
    roleAssignmentName: roleAssignmentId.result,
    principalId: principalId,
    // ID for "Storage Blob Data Reader":
    // https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#storage-blob-data-reader
    roleDefinitionId: pulumi.interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/b7e6dc6d-f1e8-4753-8033-0f276bb0955b`,
    scope: pulumi.interpolate`${storageAccount.id}/blobServices/default/containers/${storageContainer.name}`,
});

// Add SQL firewall exceptions
const firewallRules = app.outboundIpAddresses.apply(
    ips => ips.split(",").map(
        ip => new sql.FirewallRule(`FR${ip}`, {
            firewallRuleName: `FR${ip}`,
            resourceGroupName: resourceGroup.name,
            startIpAddress: ip,
            endIpAddress: ip,
            serverName: sqlServer.name,
        }),
    ));

export const endpoint = pulumi.interpolate`https://${app.defaultHostName}`;

function signedBlobReadUrl(blob: storage.Blob, container: storage.BlobContainer, account: storage.StorageAccount, resourceGroup: resources.ResourceGroup): pulumi.Output<string> {
    const blobSAS = pulumi.all<string>([blob.name, container.name, account.name, resourceGroup.name]).apply(args =>
        storage.listStorageAccountServiceSAS({
            accountName: args[2],
            protocols: storage.HttpProtocol.Https,
            sharedAccessExpiryTime: "2030-01-01",
            sharedAccessStartTime: "2021-01-01",
            resourceGroupName: args[3],
            resource: storage.SignedResource.C,
            permissions: storage.Permissions.R,
            canonicalizedResource: "/blob/" + args[2] + "/" + args[1],
            contentType: "application/json",
            cacheControl: "max-age=5",
            contentDisposition: "inline",
            contentEncoding: "deflate",
        }));

    return pulumi.interpolate`https://${account.name}.blob.core.windows.net/${container.name}/${blob.name}?${blobSAS.serviceSasToken}`;
}
