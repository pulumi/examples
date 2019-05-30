import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

import { CDNCustomDomainResource } from "./cdnCustomDomain";

const location = "West US";

/** The custom domain host of the CDN endpoint. */
export let cdnCustomDomainResource: CDNCustomDomainResource | undefined;

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup", {
    location: location,
});

// Create an Azure resource (Storage Account) so we can point the CDN endpoint to it.
const storageAccount = new azure.storage.Account("storage-account", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

// Create a Blob container in the storage account.
const blobContainer = new azure.storage.Container("blob-container", {
    resourceGroupName: resourceGroup.name,
    storageAccountName: storageAccount.name,
    containerAccessType: "blob"
});

const cdnProfile = new azure.cdn.Profile("cdn-profile", {
    location: location,
    resourceGroupName: resourceGroup.name,
    sku: "Standard_Akamai",
});

const cdnEndpoint = new azure.cdn.Endpoint("my-cdn-endpoint", {
    name: "my-cdn-endpoint",
    resourceGroupName: resourceGroup.name,
    profileName: cdnProfile.name,
    isHttpsAllowed: true,
    isHttpAllowed: false,
    location: location,
    isCompressionEnabled: true,
    originHostHeader: storageAccount.primaryBlobEndpoint,
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
        "image/jpeg"
    ],
    origins: [
        {
            name: "nyp-functionapp-origin",
            hostName: storageAccount.primaryBlobEndpoint,
            httpsPort: 443,
        }
    ]
});

export const cdnEndpointUrl = pulumi.interpolate `https://${cdnEndpoint.hostName}`;

pulumi.all([resourceGroup.name, cdnProfile.name, cdnEndpoint.name])
    .apply(([resourceGroupName, cdnProfileName, cdnEndpointName]) => {
        cdnCustomDomainResource = new CDNCustomDomainResource("cdnCustomDomain", {
            // Ensure that there is a CNAME record for mycompany.com
            // pointing to my-cdn-endpoint.azureedge.net.
            // You would do that in your domain registrar's portal.
            customDomainHostName: "mycompany.com",
            customDomainName: "custom-domain",
            profileName: cdnProfileName,
            endpointName: cdnEndpointName,
            // This will enable HTTPS through Azure's one-click
            // automated certificate deployment.
            // The certificate is fully managed by Azure from provisioning
            // to automatic renewal at no additional cost to you.
            httpsEnabled: true,
            resourceGroupName: resourceGroupName
        }, { parent: cdnEndpoint });
    });
