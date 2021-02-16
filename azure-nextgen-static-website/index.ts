// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as cdn from "@pulumi/azure-nextgen/cdn/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

// TODO: Remove after autonaming support is added.
const randomSuffix = new random.RandomString("random", {
    length: 10,
    special: false,
    upper: false,
});

const config = new pulumi.Config();
const location = config.get("location") || "westus";
const storageAccountName = config.get("storageAccountName") || pulumi.interpolate `site${randomSuffix.result}`;
const cdnEndpointName = config.get("cdnEndpointName") || pulumi.interpolate `cdn-endpnt-${storageAccountName}`;
const cdnProfileName = config.get("cdnProfileName") || pulumi.interpolate `cdn-profile-${storageAccountName}`;

const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: pulumi.interpolate `rg${randomSuffix.result}`,
    location: location,
});

const profile = new cdn.Profile("profile", {
    profileName: cdnProfileName,
    resourceGroupName: resourceGroup.name,
    sku: {
        name: cdn.SkuName.Standard_Microsoft,
    },
});

const storageAccount = new storage.StorageAccount("storageAccount", {
    accessTier: storage.AccessTier.Hot,
    accountName: storageAccountName,
    enableHttpsTrafficOnly: true,
    encryption: {
        keySource: storage.KeySource.Microsoft_Storage,
        services: {
            blob: {
                enabled: true,
            },
            file: {
                enabled: true,
            },
        },
    },
    kind: storage.Kind.StorageV2,
    networkRuleSet: {
        bypass: storage.Bypass.AzureServices,
        defaultAction: storage.DefaultAction.Allow,
    },
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
});

const endpointOrigin = storageAccount.primaryEndpoints.apply(ep => ep.web.replace("https://", "").replace("/", ""));

const endpoint = new cdn.Endpoint("CDNEndpoint", {
    contentTypesToCompress: [],
    endpointName: cdnEndpointName,
    isCompressionEnabled: false,
    isHttpAllowed: false,
    isHttpsAllowed: true,
    originHostHeader: endpointOrigin,
    origins: [{
        hostName: endpointOrigin,
        httpsPort: 443,
        name: pulumi.interpolate `${cdnEndpointName}-origin-${randomSuffix.result}`,
    }],
    profileName: profile.name,
    queryStringCachingBehavior: cdn.QueryStringCachingBehavior.NotSet,
    resourceGroupName: resourceGroup.name,
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
        blobName: name,
        resourceGroupName: resourceGroup.name,
        accountName: storageAccount.name,
        containerName: staticWebsite.containerName,
        type: storage.BlobType.Block,
        source: new pulumi.asset.FileAsset(`./wwwroot/${name}`),
        contentType: "text/html",
    }),
);

// Web endpoint to the website
export const staticEndpoint = storageAccount.primaryEndpoints.web;

// CDN endpoint to the website.
// Allow it some time after the deployment to get ready.
export const cdnEndpoint = pulumi.interpolate`https://${endpoint.hostName}/`;
