// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { StorageStaticWebsite } from "./staticWebsite";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("website-rg", {
    location: "West US",
});

// Create a Storage Account for our static website
const storageAccount = new azure.storage.Account("websitesa", {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
    accountKind: "StorageV2",
});

// There's currently no way to enable the Static Web Site feature of a storage account via ARM
// Therefore, we created a custom resource which wraps corresponding Azure CLI commands
const staticWebsite = new StorageStaticWebsite("website-static", {
    accountName: storageAccount.name,
});

// Upload the files
["index.html", "404.html"].map(name => 
    new azure.storage.Blob(name, {
        name,
        resourceGroupName: resourceGroup.name,
        storageAccountName: storageAccount.name,
        storageContainerName: staticWebsite.webContainerName,
        type: "block",
        source: `./wwwroot/${name}`,
        contentType: "text/html",
    })
);

// Web endpoint to the website
export const staticEndpoint = staticWebsite.endpoint;

// Optionally, we can add a CDN in front of the website
const cdn =  new azure.cdn.Profile("website-cdn", {
    resourceGroupName: resourceGroup.name,
    sku: "Standard_Microsoft",
});

const endpoint = new azure.cdn.Endpoint("website-cdn-ep", {
    resourceGroupName: resourceGroup.name,
    profileName: cdn.name,
    originHostHeader: staticWebsite.hostName,
    origins: [{
        name: "blobstorage",
        hostName: staticWebsite.hostName,
    }],
});

// CDN endpoint to the website. 
// Allow it some time after the deployment to get ready.
export const cdnEndpoint = pulumi.interpolate`https://${endpoint.hostName}/`;
