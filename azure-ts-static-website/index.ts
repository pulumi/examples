// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as cdn from "@pulumi/azure-native/cdn";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as pulumi from "@pulumi/pulumi";

const resourceGroup = new resources.ResourceGroup("resourceGroup");

const profile = new cdn.Profile("profile", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: cdn.SkuName.Standard_Microsoft,
    },
});

const storageAccount = new storage.StorageAccount("storageaccount", {
    enableHttpsTrafficOnly: true,
    kind: storage.Kind.StorageV2,
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
});

// Enable static website support
const staticWebsite = new storage.StorageAccountStaticWebsite("staticWebsite", {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    indexDocument: "index.html",
    error404Document: "404.html",
});

// Upload the files
["index.html", "404.html"].map(name =>
    new storage.Blob(name, {
        resourceGroupName: resourceGroup.name,
        accountName: storageAccount.name,
        containerName: staticWebsite.containerName,
        source: new pulumi.asset.FileAsset(`./wwwroot/${name}`),
        contentType: "text/html",
    }),
);

// Web endpoint to the website
export const staticEndpoint = storageAccount.primaryEndpoints.web;

// Optionally, add a CDN.
const endpointOrigin = storageAccount.primaryEndpoints.apply(ep => ep.web.replace("https://", "").replace("/", ""));
const endpoint = new cdn.Endpoint("endpoint", {
    endpointName: storageAccount.name.apply(sa => `cdn-endpnt-${sa}`),
    isHttpAllowed: false,
    isHttpsAllowed: true,
    originHostHeader: endpointOrigin,
    origins: [{
        hostName: endpointOrigin,
        httpsPort: 443,
        name: "origin-storage-account",
    }],
    profileName: profile.name,
    queryStringCachingBehavior: cdn.QueryStringCachingBehavior.NotSet,
    resourceGroupName: resourceGroup.name,
});

// CDN endpoint to the website.
// Allow it some time after the deployment to get ready.
export const cdnEndpoint = pulumi.interpolate`https://${endpoint.hostName}/`;
