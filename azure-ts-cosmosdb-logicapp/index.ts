// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as authorization from "@pulumi/azure-native/authorization";
import * as documentdb from "@pulumi/azure-native/documentdb";
import * as logic from "@pulumi/azure-native/logic";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as web from "@pulumi/azure-native/web";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("logicappdemo-rg");

// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("logicappdemosa", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Cosmos DB Account
const cosmosdbAccount = new documentdb.DatabaseAccount("logicappdemo-cdb", {
    resourceGroupName: resourceGroup.name,
    databaseAccountOfferType: documentdb.DatabaseAccountOfferType.Standard,
    locations: [{
        locationName: resourceGroup.location,
        failoverPriority: 0,
    }],
    consistencyPolicy: {
        defaultConsistencyLevel: documentdb.DefaultConsistencyLevel.Session,
    },
});

// Cosmos DB Database
const db = new documentdb.SqlResourceSqlDatabase("sqldb", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    resource: {
        id: "sqldb",
    },
});

// Cosmos DB SQL Container
const dbContainer = new documentdb.SqlResourceSqlContainer("container", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    databaseName: db.name,
    resource: {
        id: "container",
        partitionKey: {
            paths: ["/myPartitionKey"],
            kind: "Hash",
        },
    },
});

const accountKeys = documentdb.listDatabaseAccountKeysOutput({
    accountName: cosmosdbAccount.name,
    resourceGroupName: resourceGroup.name,
});

const clientConfig = pulumi.output(authorization.getClientConfig());

const apiId = pulumi.interpolate`/subscriptions/${clientConfig.subscriptionId}/providers/Microsoft.Web/locations/${resourceGroup.location}/managedApis/documentdb`;

// API Connection to be used in a Logic App
const connection = new web.Connection("cosmosdbConnection", {
    resourceGroupName: resourceGroup.name,
    properties: {
        displayName: "cosmosdb_connection",
        api: {
            id: apiId,
        },
        parameterValues: {
            databaseAccount: cosmosdbAccount.name,
            accessKey: accountKeys.primaryMasterKey,
        },
    },
});

// Logic App with an HTTP trigger and Cosmos DB action
const workflow = new logic.Workflow("httpToCosmos", {
    resourceGroupName: resourceGroup.name,
    definition: {
        $schema: "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
        contentVersion: "1.0.0.0",
        parameters: {
            $connections: {
                defaultValue: {},
                type: "Object",
            },
        },
        triggers: {
            Receive_post: {
                type: "Request",
                kind: "Http",
                inputs: {
                    method: "POST",
                    schema: {
                        properties: {},
                        type: "object",
                    },
                },
            },
        },
        actions: {
            write_body: {
                type: "ApiConnection",
                inputs: {
                    body: {
                        data: "@triggerBody()",
                        id: "@utcNow()",
                    },
                    host: {
                        connection: {
                            name: `@parameters('$connections')['documentdb']['connectionId']`,
                        },
                    },
                    method: "post",
                    path: pulumi.interpolate`/dbs/${db.name}/colls/${dbContainer.name}/docs`,
                },
            },
        },
    },
    parameters: {
        $connections: {
            value: {
                documentdb: {
                    connectionId: connection.id,
                    connectionName: "logicapp-cosmosdb-connection",
                    id: apiId,
                },
            },
        },
    },
});

const callbackUrls = logic.listWorkflowTriggerCallbackUrlOutput({
    resourceGroupName: resourceGroup.name,
    workflowName: workflow.name,
    triggerName: "Receive_post",
});

// Export the HTTP endpoint
export const endpoint = callbackUrls.value;
