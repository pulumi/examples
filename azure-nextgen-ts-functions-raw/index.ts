// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";
import * as pulumi from "@pulumi/pulumi";

// Create a resource group for Windows App Service Plan
const resourceGroup = new resources.ResourceGroup("windowsrg", {
    resourceGroupName: "windowsrg",
    location: "westus",
});

const storageAccount = new storage.StorageAccount("functionsa", {
    accountName: "functionsa2021",
    resourceGroupName: resourceGroup.name,
    kind: storage.Kind.StorageV2,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
});

const plan = new web.AppServicePlan("windows-plan", {
    name: "functions-windows-plan",
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Y1",
        tier: "Dynamic",
    },
});

const container = new storage.BlobContainer("container", {
    containerName: "blob-container",
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    publicAccess: storage.PublicAccess.None,
});

const dotnetBlob = new storage.Blob("dotnetBlob", {
    blobName: "dotnetBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./dotnet/bin/Debug/netcoreapp3.1/publish"),
});

const dotnetBlobSignedURL = signedBlobReadUrl(dotnetBlob, container, storageAccount, resourceGroup);

const dotnetApp = new web.WebApp("http-dotnet", {
    name: "httpdotnet",
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "dotnet" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "dotnet" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: dotnetBlobSignedURL },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

const nodeBlob = new storage.Blob("nodeBlob", {
    blobName: "nodeBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./javascript"),
});

const nodeBlobSignedURL = signedBlobReadUrl(nodeBlob, container, storageAccount, resourceGroup);

const nodeApp = new web.WebApp("http-node", {
    name: "httpnode",
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "node" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: nodeBlobSignedURL },
            { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~12" },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

const powershellBlob = new storage.Blob("powershellBlob", {
    blobName: "powershellBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./powershell"),
});

const powershellBlobSignedURL = signedBlobReadUrl(powershellBlob, container, storageAccount, resourceGroup);

const powershellApp = new web.WebApp("http-powershell", {
    name: "httppowershell",
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "powershell" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "powershell" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: powershellBlobSignedURL },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

const javaBlob = new storage.Blob("javaBlob", {
    blobName: "javaBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./java/target/azure-functions/fabrikam-functions"),
});

const javaBlobSignedURL = signedBlobReadUrl(javaBlob, container, storageAccount, resourceGroup);

const javaApp = new web.WebApp("http-java", {
    name: "httpjava",
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "java" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "java" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: javaBlobSignedURL },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

// Create a dedicated resource group for Linux App Service Plan - require for Python
const linuxResourceGroup = new resources.ResourceGroup("linuxrg", { resourceGroupName: "linuxrg" });

// Python Function App won't run on Windows Consumption Plan, so we create a Linux Consumption Plan instead
const linuxPlan = new web.AppServicePlan("linux-asp", {
    name: "linux-asp",
    resourceGroupName: linuxResourceGroup.name,
    kind: "Linux",
    sku: {
        name: "Y1",
        tier: "Dynamic",
    },
    reserved: true,
});

const pythonBlob = new storage.Blob("pythonBlob", {
    blobName: "pythonBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./python"),
});

const pythonBlobSignedURL = signedBlobReadUrl(pythonBlob, container, storageAccount, resourceGroup);

const pythonApp = new web.WebApp("http-python", {
    name: "httppython",
    resourceGroupName: resourceGroup.name,
    serverFarmId: linuxPlan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "python" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "python" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: pythonBlobSignedURL },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

// Azure Functions on Premium Plan
const premiumPlan = new web.AppServicePlan("premium-asp", {
    name: "premiumasp",
    resourceGroupName: resourceGroup.name,
    kind: "elastic",
    sku: {
        tier: "ElasticPremium",
        name: "EP1",
    },
    maximumElasticWorkerCount: 20,
});

const premiumBlob = new storage.Blob("premiumBlob", {
    blobName: "premiumBlob",
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    type: storage.BlobType.Block,
    source: new pulumi.asset.FileArchive("./dotnet/bin/Debug/netcoreapp3.1/publish"),
});

const premiumBlobSignedURL = signedBlobReadUrl(premiumBlob, container, storageAccount, resourceGroup);

const premiumApp = new web.WebApp("http-premium", {
    name: "httppremium",
    resourceGroupName: resourceGroup.name,
    serverFarmId: premiumPlan.id,
    kind: "FunctionApp",
    siteConfig: {
        appSettings: [
            { name: "runtime", value: "dotnet" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: premiumBlobSignedURL },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
        ],
    },
});

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


export const dotnetEndpoint = dotnetApp.defaultHostName.apply(ep => `https://${ep}/api/HelloDotnet?name=Pulumi`);
export const nodeEndpoint = nodeApp.defaultHostName.apply(ep => `https://${ep}/api/HelloNode?name=Pulumi`);
export const powershellEndpoint = powershellApp.defaultHostName.apply(ep => `https://${ep}/api/HelloPS?name=Pulumi`);
export const javaEndpoint = javaApp.defaultHostName.apply(ep => `https://${ep}/api/HelloJava?name=Pulumi`);
export const pythonEndpoint = pythonApp.defaultHostName.apply(ep => `https://${ep}/api/HelloPython?name=Pulumi`);
export const premiumEndpoint = premiumApp.defaultHostName.apply(ep => `https://${ep}/api/HelloDotnet?name=PulumiOnPremium`);
