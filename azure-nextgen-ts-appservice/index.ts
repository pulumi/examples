// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as insights from "@pulumi/azure-nextgen/insights/latest";
import * as resource from "@pulumi/azure-nextgen/resources/latest";
import * as sql from "@pulumi/azure-nextgen/sql/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";
import * as pulumi from "@pulumi/pulumi";

// use first 10 characters of the stackname as prefix for resource names
const prefix = (pulumi.getProject()+pulumi.getStack()).substring(0, 9);

const resourceGroup = new resource.ResourceGroup(`${prefix}-rg`,
{
    resourceGroupName: `${prefix}-rg`,
    location: "westus2",
});

const resourceGroupArgs = {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
};

// Storage Account name must be lowercase and cannot have any dash characters
const storageAccountName = `${prefix.toLowerCase().replace(/-/g, "")}sa`;
const storageAccount = new storage.StorageAccount(storageAccountName, {
    ...resourceGroupArgs,
    kind: storage.Kind.StorageV2,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    accountName: storageAccountName,
});


const appServicePlan = new web.AppServicePlan(`${prefix}-asp`, {
    ...resourceGroupArgs,
    name: `${prefix}-asp`,
    kind: "App",

    sku: {
        name: "B1",
        tier: "Basic",
    },
});

const storageContainer = new storage.BlobContainer(`${prefix}-c`, {
    accountName: storageAccount.name,
    containerName: `${prefix}-c`,
    publicAccess: storage.PublicAccess.None,
    ...resourceGroupArgs,
});

// TODO - replace with Blob in azure-nextgen
const blob = new storage.Blob(`${prefix}-b`, {
    blobName: `${prefix}-b`,

    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: storageContainer.name,
    type: "Block",

    source: new pulumi.asset.FileArchive("wwwroot"),
});

const codeBlobUrl = pulumi.all(
    [storageAccount.name, storageContainer.name, blob.name, resourceGroup.name]).apply(
        args => getSASToken(args[0], args[1], args[2], args[3]));

const appInsights = new insights.Component(`${prefix}-ai`, {
    ...resourceGroupArgs,

    kind: "web",
    applicationType: insights.ApplicationType.Web,
    resourceName: `${prefix}-ai`,
});

const username = "pulumi";

// Get the password to use for SQL from config.
const config = new pulumi.Config();
const pwd = config.require("sqlPassword");

const sqlServer = new sql.Server(`${prefix}-sqlserver`, {
    ...resourceGroupArgs,

    serverName: `${prefix}-sqlserver1`,
    administratorLogin: username,
    administratorLoginPassword: pwd,
    version: "12.0",
});

const database = new sql.Database(`${prefix}-db`, {
    ...resourceGroupArgs,

    databaseName: `${prefix}-db`,
    serverName: sqlServer.name,
    requestedServiceObjectiveName: sql.ServiceObjectiveName.S0,
});

const app = new web.WebApp(`${prefix}-as`, {
    ...resourceGroupArgs,

    name: `${prefix}-as`,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            {
                name: "APPINSIGHTS_INSTRUMENTATIONKEY",
                value: appInsights.instrumentationKey,
            },
            {
                name: "APPLICATIONINSIGHTS_CONNECTION_STRING",
                value: pulumi.interpolate`InstrumentationKey=${appInsights.instrumentationKey}`,
            },
            {
                name: "ApplicationInsightsAgent_EXTENSION_VERSION",
                value: "~2",
            },
            {
                name: "WEBSITE_RUN_FROM_PACKAGE",
                value: codeBlobUrl,
            },
        ],
        connectionStrings: [{
            name: "db",
            connectionString:
                pulumi.all([sqlServer.name, database.name]).apply(([server, db]) =>
                    `Server=tcp:${server}.database.windows.net;initial catalog=${db};user ID=${username};password=${pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;`),
            type: web.ConnectionStringType.SQLAzure,
        }],
    },
});

export const endpoint = pulumi.interpolate `https://${app.defaultHostName}`;

function getSASToken(storageAccountName: string, storageContainerName: string, blobName: string, resourceGroupName: string): pulumi.Output<string> {
    const blobSAS = storage.listStorageAccountServiceSAS({
        accountName: storageAccountName,
        protocols: storage.HttpProtocol.Https,
        sharedAccessStartTime: "2021-01-01",
        sharedAccessExpiryTime: "2030-01-01",
        resource: storage.SignedResource.C,
        resourceGroupName: resourceGroupName,
        permissions: storage.Permissions.R,
        canonicalizedResource: "/blob/" + storageAccountName + "/" + storageContainerName,
        contentType: "application/json",
        cacheControl: "max-age=5",
        contentDisposition: "inline",
        contentEncoding: "deflate",
    });
    return pulumi.interpolate `https://${storageAccountName}.blob.core.windows.net/${storageContainerName}/${blobName}?${blobSAS.then(x => x.serviceSasToken)}`;
}
