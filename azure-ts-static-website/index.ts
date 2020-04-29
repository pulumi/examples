// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("website-rg", {
    location: azure.Locations.WestUS,
});

// Create a Storage Account for our static website
const storageAccount = new azure.storage.Account("websitesa", {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
    accountKind: "StorageV2",
    staticWebsite: {
        indexDocument: "index.html",
    },
});

// Upload the files
["index.html", "404.html"].map(name =>
    new azure.storage.Blob(name, {
        name,
        storageAccountName: storageAccount.name,
        storageContainerName: "$web",
        type: "Block",
        source: new pulumi.asset.FileAsset(`./wwwroot/${name}`),
        contentType: "text/html",
    }),
);

// Web endpoint to the website
export const staticEndpoint = storageAccount.primaryWebEndpoint;

// We can add a CDN in front of the website
const cdn =  new azure.cdn.Profile("website-cdn", {
    resourceGroupName: resourceGroup.name,
    sku: "Standard_Microsoft",
});

const endpoint = new azure.cdn.Endpoint("website-cdn-ep", {
    resourceGroupName: resourceGroup.name,
    profileName: cdn.name,
    originHostHeader: storageAccount.primaryWebHost,
    origins: [{
        name: "blobstorage",
        hostName: storageAccount.primaryWebHost,
    }],
});

// CDN endpoint to the website.
// Allow it some time after the deployment to get ready.
export const cdnEndpoint = pulumi.interpolate`https://${endpoint.hostName}/`;
