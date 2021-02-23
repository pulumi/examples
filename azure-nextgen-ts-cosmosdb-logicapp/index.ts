// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as authorization from "@pulumi/azure-nextgen/authorization/latest";
import * as documentdb from "@pulumi/azure-nextgen/documentdb/latest";
import * as logic from "@pulumi/azure-nextgen/logic/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("logicappdemo-rg", {
    resourceGroupName: "logicappdemo-rg",
});

// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("logicappdemosa", {
    accountName: "logicappdemosa21",
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Cosmos DB Account
const cosmosdbAccount = new documentdb.DatabaseAccount("logicappdemo-cdb", {
    accountName: "logicappdemo-cdb",
    resourceGroupName: resourceGroup.name,
    databaseAccountOfferType: documentdb.DatabaseAccountOfferType.Standard,
    locations: [{ locationName: resourceGroup.location, failoverPriority: 0 }],
    consistencyPolicy: {
        defaultConsistencyLevel: documentdb.DefaultConsistencyLevel.Session,
    },
});

// Cosmos DB Database
const db = new documentdb.SqlResourceSqlDatabase("db", {
    databaseName: "sqldb",
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    resource: {
        id: "sqldb",
    },
});

// Cosmos DB SQL Container
const dbContainer = new documentdb.SqlResourceSqlContainer("container", {
    containerName: "container",
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    databaseName: db.name,
    resource: {
        id: "container",
    },
});

const accountKeys = pulumi.all([resourceGroup.name, cosmosdbAccount.name]).apply(async args => {
    const resourceGroupName = args[0];
    const accountName = args[1];
    const accountKeys = documentdb.listDatabaseAccountKeys({
        accountName: accountName,
        resourceGroupName: resourceGroupName,
    });
    return await accountKeys;
});

const clientConfig = pulumi.output(authorization.getClientConfig());

const apiId = pulumi.interpolate`/subscriptions/${clientConfig.subscriptionId}/providers/Microsoft.Web/locations/${resourceGroup.location}/managedApis/documentdb`;

/*
 * API Connection to be used in a Logic App
 */
const connection = new web.Connection("cosmosdbConnection", {
    connectionName: "cosmosdbConnection",
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

/*
 * Logic App with an HTTP trigger and Cosmos DB action
 */
const workflow = new logic.Workflow("workflow", {
    workflowName: "httpToCosmos",
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
                            name: "@parameters('$connections')['documentdb']['connectionId']",
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

const callbackUrls = pulumi.all([resourceGroup.name, workflow.name]).apply(args => {
    return logic.listWorkflowTriggerCallbackUrl({ resourceGroupName: args[0], workflowName: args[1], triggerName: "Receive_post" });
});

// Export the HTTP endpoint
export const endpoint = callbackUrls.value;
