// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as web from "@pulumi/azure-nextgen/web/v20200601";

import { getConnectionString, signedBlobReadUrl } from "./helpers";

const config = new pulumi.Config();
const location = config.get("location") || "WestUS";

// Create a separate resource group for this example.
const resourceGroup = new resources.ResourceGroup("rg", {
    resourceGroupName: "functions-rg",
    location: location,
});

// Storage Account and App Service names have to be globally unique.
// Generate a random suffix for those names.
const suffix = new random.RandomString("suffix", {
    length: 12,
    number: false,
    special: false,
    upper: false,
}).result;

// Storage account is required by Function App.
// Also, we will upload the function code to the same storage account.
const storageAccount = new storage.StorageAccount("sa", {
    resourceGroupName: resourceGroup.name,
    accountName: pulumi.interpolate`sa${suffix}`,
    location: resourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Function code archives will be stored in this container.
const codeContainer = new storage.BlobContainer("container", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: "zips",
});

// Upload Azure Function's code as a zip archive to the storage account.
// Note that we use the "old" provider for this: see https://github.com/pulumi/pulumi-azure-nextgen/issues/13
const codeBlob = new azure.storage.Blob("zip", {
    storageAccountName: storageAccount.name,
    storageContainerName: codeContainer.name,
    type: "Block",
    source: new pulumi.asset.FileArchive("./javascript"),
});

// Define a Consumption Plan for the Function App.
// You can change the SKU to Premium or App Service Plan if needed.
const plan = new web.AppServicePlan("plan", {
    resourceGroupName: resourceGroup.name,
    name: "plan",
    location: resourceGroup.location,
    sku: {
        name: "Y1",
        tier: "Dynamic",
    },
});

// Build the connection string and zip archive's SAS URL. They will go to Function App's settings.
const storageConnectionString = getConnectionString(resourceGroup.name, storageAccount.name);
const codeBlobUrl = signedBlobReadUrl(resourceGroup.name, storageAccount.name, codeContainer.name, codeBlob.name);

const app = new web.WebApp("fa", {
    resourceGroupName: resourceGroup.name,
    name: pulumi.interpolate`app-${suffix}`,
    location: resourceGroup.location,
    serverFarmId: plan.id,
    kind: "functionapp",
    siteConfig: {
        appSettings: [
            { name: "AzureWebJobsStorage", value: storageConnectionString },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
            { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~14" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: codeBlobUrl },
        ],
        http20Enabled: true,
        nodeVersion: "~14",
    },
});

export const endpoint = pulumi.interpolate`https://${app.defaultHostName}/api/HelloNode?name=Pulumi`;
