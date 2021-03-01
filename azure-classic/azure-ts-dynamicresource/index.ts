// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

import { CDNCustomDomainResource } from "./cdnCustomDomain";

/**
 * The location where our resource group and the resources under it will be created.
 *
 * To externalize this value, and make this configurable across environments/stacks,
 * learn more at https://www.pulumi.com/docs/intro/concepts/config/.
 */
const location = azure.Locations.WestUS;

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup", {
    location: location,
});

// Create an Azure resource (Storage Account) so we can point the CDN endpoint to it.
const storageAccount = new azure.storage.Account("storageAccount", {
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

/**
 * Create a Blob container in the storage account,
 * to store any static files. The CDN endpoint will be pointed at the
 * endpoint for this blob container.
 */
const blobContainer = new azure.storage.Container("blobContainer", {
    storageAccountName: storageAccount.name,
    // Make each "blob" in the container publicly accessible.
    // DO NOT set this property if you are going to store sensitive files!
    containerAccessType: "blob",
});

const cdnProfile = new azure.cdn.Profile("cdnProfile", {
    resourceGroupName: resourceGroup.name,
    // Choose an appropriate SKU to use.
    // https://docs.microsoft.com/en-us/azure/cdn/cdn-features
    sku: "Standard_Akamai",
});

const cdnEndpoint = new azure.cdn.Endpoint("cdnEndpoint", {
    /**
     * Specify a well-known name for the endpoint name,
     * so you can add a CNAME record for your custom domain
     * pointing to this CDN endpoint to it.
     *
     * For example, the URL for this CDN endpoint when it is created
     * would be `my-cdn-endpoint.azureedge.net`.
     */
    name: "my-cdn-endpoint",
    resourceGroupName: resourceGroup.name,
    profileName: cdnProfile.name,
    isHttpsAllowed: true,
    isHttpAllowed: false,
    isCompressionEnabled: true,
    originHostHeader: storageAccount.primaryBlobHost,
    contentTypesToCompresses: [
        "text/plain",
        "text/html",
        "text/css",
        "text/javascript",
        "application/x-javascript",
        "application/javascript",
        "application/json",
        "application/xml",
        "image/png",
        "image/jpeg",
    ],
    origins: [
        {
            name: "cdn-origin",
            hostName: storageAccount.primaryBlobHost,
            httpsPort: 443,
        },
    ],
});

export const cdnEndpointUrl = pulumi.interpolate`https://${cdnEndpoint.hostName}`;

export const cdnCustomDomainResource = new CDNCustomDomainResource("cdnCustomDomain", {
    resourceGroupName: resourceGroup.name,
    // Ensure that there is a CNAME record for mycompany.com pointing to my-cdn-endpoint.azureedge.net.
    // You would do that in your domain registrar's portal.
    customDomainHostName: "mycompany.com",
    profileName: cdnProfile.name,
    endpointName: cdnEndpoint.name,
    /**
     * This will enable HTTPS through Azure's one-click
     * automated certificate deployment. The certificate is
     * fully managed by Azure from provisioning to automatic renewal
     * at no additional cost to you.
     */
    httpsEnabled: true,
}, { parent: cdnEndpoint });
