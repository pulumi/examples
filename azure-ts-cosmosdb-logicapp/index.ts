// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("logicappdemo-rg");

// Create an Azure resource (Storage Account)
const storageAccount = new azure.storage.Account("logicappdemosa", {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
    accountKind: "StorageV2",
});

// Cosmos DB Account
const cosmosdbAccount = new azure.cosmosdb.Account("logicappdemo-cdb", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    offerType: "Standard",
    geoLocations: [{ location: resourceGroup.location, failoverPriority: 0 }],
    consistencyPolicy: {
        consistencyLevel: "Session",
    },
});

// Cosmos DB Database
const db = new azure.cosmosdb.SqlDatabase("db", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
});

// Cosmos DB SQL Container
const dbContainer = new azure.cosmosdb.SqlContainer("container", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    databaseName: db.name,
});

/*
 * API Connection to be used in a Logic App
 */

// Calculate the subscription path
const subscriptionId = resourceGroup.id.apply(id => {
    const splitId = id.split("/");
    return `/${splitId[1]}/${splitId[2]}`;
});

// ARM Template with a connection
const connectionTemplate = {
    $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    contentVersion: "1.0.0.0",
    resources: [{
        type: "Microsoft.Web/connections",
        apiVersion: "2016-06-01",
        name: "cosmosdb-connection",
        location: resourceGroup.location,
        properties: {
            displayName: "cosmosdb_connection",
            api: {
                id: pulumi.interpolate`${subscriptionId}/providers/Microsoft.Web/locations/${resourceGroup.location}/managedApis/documentdb`,
            },
            parameterValues: {
                databaseAccount: db.accountName,
                accessKey: cosmosdbAccount.primaryMasterKey,
            },
        },
    }],
};

// Template deployment
const cosmosdbConnection = new azure.core.TemplateDeployment("db-connection", {
    resourceGroupName: resourceGroup.name,
    templateBody: pulumi.output(connectionTemplate).apply(JSON.stringify),
    deploymentMode: "Incremental",
}, { dependsOn: [cosmosdbAccount, db, dbContainer] });

/*
 * Logic App with an HTTP trigger and Cosmos DB action
 */

 // ARM Template with a Logic App listening to an HTTP endpoint
const processUrlTemplate = {
    $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    contentVersion: "1.0.0.0",
    parameters: {
        connections_cosmosdb_externalid: {
            defaultValue: pulumi.interpolate`${resourceGroup.id}/providers/Microsoft.Web/connections/${connectionTemplate.resources[0].name}`,
            type: "String",
        },
    },
    outputs: {
        endpoint: {
            type: "String",
            value: pulumi.interpolate`[listCallbackUrl(resourceId('${resourceGroup.name}','Microsoft.Logic/workflows/triggers', 'http-to-cosmos', 'Receive_post'), '2016-06-01').value]`,
        },
    },
    variables: {},
    resources: [
        {
            type: "Microsoft.Logic/workflows",
            apiVersion: "2017-07-01",
            name: "http-to-cosmos",
            location: resourceGroup.location,
            properties: {
                state: "Enabled",
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
                    },
                },
                parameters: {
                    $connections: {
                        value: {
                            documentdb: {
                                connectionId: "[parameters('connections_cosmosdb_externalid')]",
                                connectionName: "logicapp-cosmosdb-connection",
                                id: pulumi.interpolate`${connectionTemplate.resources[0].properties.api.id}`,
                            },
                        },
                    },
                },
            },
        },
    ],
};

// Template deployment
const procesUrlWorkflow = new azure.core.TemplateDeployment("logic-app", {
    resourceGroupName: resourceGroup.name,
    templateBody: pulumi.output(processUrlTemplate).apply(JSON.stringify),
    deploymentMode: "Incremental",
}, { dependsOn: [cosmosdbConnection] });

// Definition of an action to insert a document into the Cosmos DB collection
const insertActionBody = {
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
};

const insertAction = new azure.logicapps.ActionCustom("Create_or_update_document", {
    logicAppId: pulumi.interpolate`${resourceGroup.id}/providers/Microsoft.Logic/workflows/${processUrlTemplate.resources[0].name}`,
    name: "Create_or_update_document",
    body: pulumi.output(insertActionBody).apply(JSON.stringify),
}, { dependsOn: [procesUrlWorkflow] });

// Export the HTTP endpoint
export const endpoint = procesUrlWorkflow.outputs["endpoint"];
