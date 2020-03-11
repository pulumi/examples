// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// use first 10 characters of the stackname as prefix for resource names
const prefix = pulumi.getStack().substring(0, 9);

const resourceGroup = new azure.core.ResourceGroup(`${prefix}-rg`);

const resourceGroupArgs = {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
};

// Storage Account name must be lowercase and cannot have any dash characters
const storageAccountName = `${prefix.toLowerCase().replace(/-/g, "")}sa`;
const storageAccount = new azure.storage.Account(storageAccountName, {
    ...resourceGroupArgs,

    accountKind: "StorageV2",
    accountTier: "Standard",
    accountReplicationType: "LRS",
});


const appServicePlan = new azure.appservice.Plan(`${prefix}-asp`, {
    ...resourceGroupArgs,

    kind: "App",

    sku: {
        tier: "Basic",
        size: "B1",
    },
});

const storageContainer = new azure.storage.Container(`${prefix}-c`, {
    storageAccountName: storageAccount.name,
    containerAccessType: "private",
});

const blob = new azure.storage.Blob(`${prefix}-b`, {
    storageAccountName: storageAccount.name,
    storageContainerName: storageContainer.name,
    type: "Block",

    source: new pulumi.asset.FileArchive("wwwroot"),
});

const codeBlobUrl = azure.storage.signedBlobReadUrl(blob, storageAccount);

const appInsights = new azure.appinsights.Insights(`${prefix}-ai`, {
    ...resourceGroupArgs,

    applicationType: "web",
});

const username = "pulumi";

// Get the password to use for SQL from config.
const config = new pulumi.Config();
const pwd = config.require("sqlPassword");

const sqlServer = new azure.sql.SqlServer(`${prefix}-sql`, {
    ...resourceGroupArgs,

    administratorLogin: username,
    administratorLoginPassword: pwd,
    version: "12.0",
});

const database = new azure.sql.Database(`${prefix}-db`, {
    ...resourceGroupArgs,
    serverName: sqlServer.name,
    requestedServiceObjectiveName: "S0",
});

const app = new azure.appservice.AppService(`${prefix}-as`, {
    ...resourceGroupArgs,

    appServicePlanId: appServicePlan.id,


    appSettings: {
        "WEBSITE_RUN_FROM_ZIP": codeBlobUrl,
        "ApplicationInsights:InstrumentationKey": appInsights.instrumentationKey,
        "APPINSIGHTS_INSTRUMENTATIONKEY": appInsights.instrumentationKey,
    },

    connectionStrings: [{
        name: "db",
        value:
            pulumi.all([sqlServer.name, database.name]).apply(([server, db]) =>
                `Server=tcp:${server}.database.windows.net;initial catalog=${db};user ID=${username};password=${pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;`),
        type: "SQLAzure",
    }],
});

export const endpoint = pulumi.interpolate `https://${app.defaultSiteHostname}`;
