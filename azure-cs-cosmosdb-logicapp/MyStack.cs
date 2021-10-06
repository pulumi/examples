// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using Pulumi;
using Authorization = Pulumi.AzureNative.Authorization;
using DocumentDB = Pulumi.AzureNative.DocumentDB;
using Logic = Pulumi.AzureNative.Logic;
using Resources = Pulumi.AzureNative.Resources;
using Storage = Pulumi.AzureNative.Storage;
using Web = Pulumi.AzureNative.Web;

class MyStack : Stack
{
    public MyStack()
    {
        // Create an Azure Resource Group
        var resourceGroup = new Resources.ResourceGroup("resourceGroup");

        // Create an Azure resource (Storage Account)
        var storageAccount = new Storage.StorageAccount("logicappdemosa", new Storage.StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new Storage.Inputs.SkuArgs
            {
                Name = Storage.SkuName.Standard_LRS,
            },
            Kind = Storage.Kind.StorageV2,
        });

        // Cosmos DB Account
        var cosmosdbAccount = new DocumentDB.DatabaseAccount("logicappdemo-cdb", new DocumentDB.DatabaseAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            DatabaseAccountOfferType = DocumentDB.DatabaseAccountOfferType.Standard,
            Locations =
            {
                new DocumentDB.Inputs.LocationArgs
                {
                    LocationName = resourceGroup.Location,
                    FailoverPriority = 0,
                },
            },
            ConsistencyPolicy = new DocumentDB.Inputs.ConsistencyPolicyArgs
            {
                DefaultConsistencyLevel = DocumentDB.DefaultConsistencyLevel.Session,
            },
        });

        // Cosmos DB Database
        var db = new DocumentDB.SqlResourceSqlDatabase("sqldb", new DocumentDB.SqlResourceSqlDatabaseArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountName = cosmosdbAccount.Name,
            Resource = new DocumentDB.Inputs.SqlDatabaseResourceArgs
            {
                Id = "sqldb",
            },
        });

        // Cosmos DB SQL Container
        var dbContainer = new DocumentDB.SqlResourceSqlContainer("container", new DocumentDB.SqlResourceSqlContainerArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountName = cosmosdbAccount.Name,
            DatabaseName = db.Name,
            Resource = new DocumentDB.Inputs.SqlContainerResourceArgs
            {
                Id = "container",
                PartitionKey = new DocumentDB.Inputs.ContainerPartitionKeyArgs { Paths = {"/myPartitionKey" }, Kind = "Hash"},
            },
        });

        var accountKeys = DocumentDB.ListDatabaseAccountKeys.Invoke(new DocumentDB.ListDatabaseAccountKeysInvokeArgs
        {
            AccountName = cosmosdbAccount.Name,
            ResourceGroupName = resourceGroup.Name
        });

        var apiId = Output.Create(Authorization.GetClientConfig.InvokeAsync())
            .Apply(clientConfig => Output.Format(
                       $"/subscriptions/{clientConfig.SubscriptionId}/providers/Microsoft.Web/locations/{resourceGroup.Location}/managedApis/documentdb"));

        // API Connection to be used in a Logic App
        var connection = new Web.Connection("cosmosdbConnection", new Web.ConnectionArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Properties = new Web.Inputs.ApiConnectionDefinitionPropertiesArgs
            {
                DisplayName = "cosmosdb_connection",
                Api = new Web.Inputs.ApiReferenceArgs
                {
                    Id = apiId,
                },
                ParameterValues =
                {
                    { "databaseAccount", cosmosdbAccount.Name },
                    { "accessKey", accountKeys.Apply(accountKeys => accountKeys.PrimaryMasterKey) },
                },
            },
        });

        // Logic App with an HTTP trigger and Cosmos DB action
        var workflow = new Logic.Workflow("httpToCosmos", new Logic.WorkflowArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Definition = new Dictionary<string, object>
            {
                { "$schema", "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#" },
                { "contentVersion", "1.0.0.0" },
                { "parameters", new Dictionary<string, object>
                {
                    { "$connections",new Dictionary<string, object>
                    {
                        { "defaultValue", new Dictionary<string, object>() },
                        { "type", "Object" },
                    } },
                } },
                { "triggers", new Dictionary<string, object>
                {
                    { "Receive_post", new Dictionary<string, object>
                    {
                        { "type", "Request" },
                        { "kind", "Http" },
                        { "inputs", new Dictionary<string, object>
                        {
                            { "method", "POST" },
                            { "schema", new Dictionary<string, object>
                            {
                                { "properties", new Dictionary<string, object>() },
                                { "type", "object" },
                            } },
                        } },
                    } },
                } },
                { "actions", new Dictionary<string, object>
                {
                    { "write_body", new Dictionary<string, object>
                    {
                        { "type", "ApiConnection" },
                        { "inputs", new Dictionary<string, object>
                        {
                            { "body", new Dictionary<string, object>
                            {
                                { "data", "@triggerBody()" },
                                { "id", "@utcNow()" },
                            } },
                            { "host", new Dictionary<string, object>
                            {
                                { "$connection",new Dictionary<string, object>
                                {
                                    { "name", "@parameters('$connections')['documentdb']['connectionId']" },
                                } },
                            } },
                            { "method", "post" },
                            { "path", Output.Tuple(db.Name, dbContainer.Name).Apply(values =>
                            {
                                var dbName = values.Item1;
                                var dbContainerName = values.Item2;
                                return $"/dbs/{dbName}/colls/{dbContainerName}/docs";
                            }) },
                        } },
                    } },
                } },
            },
            Parameters =
            {
                { "$connections", new Logic.Inputs.WorkflowParameterArgs
                {
                    Value = new Dictionary<string, object>
                    {
                        { "documentdb", new Dictionary<string, object>
                        {
                            { "connectionId", connection.Id },
                            { "connectionName", "logicapp-cosmosdb-connection" },
                            { "id", apiId },
                        } },
                    },
                } },
            },
        });

        var callbackUrls = Logic.ListWorkflowTriggerCallbackUrl.Invoke(new Logic.ListWorkflowTriggerCallbackUrlInvokeArgs
        {
            ResourceGroupName = resourceGroup.Name,
            WorkflowName = workflow.Name,
            TriggerName = "Receive_post",
        });

        this.Endpoint = callbackUrls.Apply(callbackUrls => callbackUrls.Value);
    }

    [Output("endpoint")]
    public Output<string> Endpoint { get; set; }
}
