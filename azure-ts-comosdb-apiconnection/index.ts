import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { CosmosContainer } from "./cosmosContainer";

// use first 10 characters of the stackname as prefix for resource names
const prefix = pulumi.getStack().substring(0, 9);

// Storage Account name must be lowercase and cannot have any dash characters
const simplePrefix = prefix.toLowerCase().replace(/-/g, "")

/********************/
/* RG + Storage Acc */
/********************/

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup(`${prefix}-rg`);

const subscriptionId = resourceGroup.id.apply(id => {
    const splitId = id.split("/")
    return `/${splitId[1]}/${splitId[2]}`;
});

// Create an Azure resource (Storage Account)
const storageAccount = new azure.storage.Account(`${simplePrefix}sa`, {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
    accountKind: "StorageV2",
});

// Cosmos DB Account
const cosmosdbAccount = new azure.cosmosdb.Account(`${prefix}-db-acc`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    offerType: "Standard",
    kind: "GlobalDocumentDB",
    consistencyPolicy: {
        consistencyLevel: "Session",
        maxIntervalInSeconds: 5,
        maxStalenessPrefix: 100,
    },
});

// DB
const db = new azure.cosmosdb.SqlDatabase(`${prefix}-db`, {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
});

const dbContainer = new CosmosContainer(`${prefix}-db-container`, {
    region: resourceGroup.location,
    endpoint: cosmosdbAccount.endpoint,
    masterKey: cosmosdbAccount.primaryMasterKey,
    collectionName: "urls",
    dbName: db.name,
});

// API Connection for later usage by LogicApps
const connectionTemplate = {
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "resources": [{
        "type": "Microsoft.Web/connections",
        "apiVersion": "2016-06-01",
        "name": "cosmosdb-connection",
        "location": pulumi.interpolate`${resourceGroup.location}`,
        "properties": {
            "displayName": "cosmosdb_connection",
            "api": {
                "id": pulumi.interpolate`${subscriptionId}/providers/Microsoft.Web/locations/${resourceGroup.location}/managedApis/documentdb`
            },
            "parameterValues": {
                "databaseAccount": pulumi.interpolate`${db.accountName}`,
                "accessKey": pulumi.interpolate`${cosmosdbAccount.primaryMasterKey}`
            }
        }
    }]
};

const cosmosdbConnection = new azure.core.TemplateDeployment("db-connection", {
    resourceGroupName: resourceGroup.name,
    templateBody: pulumi.output(connectionTemplate).apply(JSON.stringify),
    deploymentMode: "Incremental",
}, { dependsOn: [cosmosdbAccount, db, dbContainer] });
