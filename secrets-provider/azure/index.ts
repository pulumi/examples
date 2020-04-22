import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

const config = new pulumi.Config();

// Make the bucketName configurable
const bucketName = config.require('bucketName');
const secretValue = config.requireSecret('secretValue');

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup", {
    name: "lbriggs-pulumi"
});

// Create an Azure resource (Storage Account)
const account = new azure.storage.Account("storage", {
    name: bucketName,
    // The location for the storage account will be derived automatically from the resource group.
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

const container = new azure.storage.Container("container", {
    name: bucketName,
    storageAccountName: account.name,
})

const blob = new azure.storage.Blob("blob", {
    storageAccountName: account.name,
    storageContainerName: container.name,
    sourceContent: secretValue,
    type: "Block",
})


// Export the connection string for the storage account
export const connectionString = account.primaryConnectionString;


