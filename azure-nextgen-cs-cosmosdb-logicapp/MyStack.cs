// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Authorization = Pulumi.AzureNextGen.Authorization.Latest;
using DocumentDB = Pulumi.AzureNextGen.DocumentDB.Latest;
using Logic = Pulumi.AzureNextGen.Logic.Latest;
using Resources = Pulumi.AzureNextGen.Resources.Latest;
using Storage = Pulumi.AzureNextGen.Storage.Latest;
using Web = Pulumi.AzureNextGen.Web.Latest;

class MyStack : Stack
{
    public MyStack()
    {
        // Create an Azure Resource Group
        var resourceGroup = new Resources.ResourceGroup("resourceGroup", new Resources.ResourceGroupArgs
        {
            ResourceGroupName = "logicappdemo-rg",
        });

        // Create an Azure resource (Storage Account)
        var storageAccount = new Storage.StorageAccount("storageAccount", new Storage.StorageAccountArgs
        {
            AccountName = "logicappdemosa21",
            ResourceGroupName = resourceGroup.Name,
            Sku = new Storage.Inputs.SkuArgs
            {
                Name = Storage.SkuName.Standard_LRS,
            },
            Kind = Storage.Kind.StorageV2,
        });

        // Cosmos DB Account
        var cosmosdbAccount = new DocumentDB.DatabaseAccount("cosmosdbAccount", new DocumentDB.DatabaseAccountArgs
        {
            AccountName = "logicappdemo-cdb",
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
        var db = new DocumentDB.SqlResourceSqlDatabase("db", new DocumentDB.SqlResourceSqlDatabaseArgs
        {
            DatabaseName = "sqldb",
            ResourceGroupName = resourceGroup.Name,
            AccountName = cosmosdbAccount.Name,
            Resource = new DocumentDB.Inputs.SqlDatabaseResourceArgs
            {
                Id = "sqldb",
            },
        });

        // Cosmos DB SQL Container
        var dbContainer = new DocumentDB.SqlResourceSqlContainer("dbContainer", new DocumentDB.SqlResourceSqlContainerArgs
        {
            ContainerName = "container",
            ResourceGroupName = resourceGroup.Name,
            AccountName = cosmosdbAccount.Name,
            DatabaseName = db.Name,
            Resource = new DocumentDB.Inputs.SqlContainerResourceArgs
            {
                Id = "container",
            },
        });

        var accountKeys = Output.Tuple(cosmosdbAccount.Name, resourceGroup.Name).Apply(values =>
        {
            var cosmosdbAccountName = values.Item1;
            var resourceGroupName = values.Item2;
            return DocumentDB.ListDatabaseAccountKeys.InvokeAsync(new DocumentDB.ListDatabaseAccountKeysArgs
            {
                AccountName = cosmosdbAccountName,
                ResourceGroupName = resourceGroupName,
            });
        });

        var clientConfig = Output.Create(Authorization.GetClientConfig.InvokeAsync());

        var apiId = Output.Tuple(clientConfig, resourceGroup.Location).Apply(values =>
        {
            var clientConfig = values.Item1;
            var location = values.Item2;
            return $"/subscriptions/{clientConfig.SubscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/documentdb";
        });

        // API Connection to be used in a Logic App
        var connection = new Web.Connection("connection", new Web.ConnectionArgs
        {
            ConnectionName = "cosmosdbConnection",
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

        var workflow = new Logic.Workflow("workflow", new Logic.WorkflowArgs
        {
            WorkflowName = "httpToCosmos",
            ResourceGroupName = resourceGroup.Name,
            Definition = 
            {
                { "$schema", "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#" },
                { "contentVersion", "1.0.0.0" },
                { "parameters", 
                {
                    { "$connections",
                    {
                        { "defaultValue",  },
                        { "type", "Object" },
                    } },
                } },
                { "triggers", 
                {
                    { "Receive_post", 
                    {
                        { "type", "Request" },
                        { "kind", "Http" },
                        { "inputs", 
                        {
                            { "method", "POST" },
                            { "schema", 
                            {
                                { "properties",  },
                                { "type", "object" },
                            } },
                        } },
                    } },
                } },
                { "actions", 
                {
                    { "write_body", 
                    {
                        { "type", "ApiConnection" },
                        { "inputs", 
                        {
                            { "body", 
                            {
                                { "data", "@triggerBody()" },
                                { "id", "@utcNow()" },
                            } },
                            { "host", 
                            {
                                { "$connection",
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
                { "connections", new Logic.Inputs.WorkflowParameterArgs
                {
                    Value = 
                    {
                        { "documentdb", 
                        {
                            { "connectionId", connection.Id },
                            { "connectionName", "logicapp-cosmosdb-connection" },
                            { "id", apiId },
                        } },
                    },
                } },
            },
        });


var callbackUrls = Output.Tuple(resourceGroup.Name, workflow.Name).Apply(values =>
{
    var resourceGroupName = values.Item1;
    var workflowName = values.Item2;
    return Logic.ListWorkflowTriggerCallbackUrl.InvokeAsync(new Logic.ListWorkflowTriggerCallbackUrlArgs
    {
        ResourceGroupName = resourceGroupName,
        WorkflowName = workflowName,
        TriggerName = "Receive_post",
    });
});
this.Endpoint = callbackUrls.Apply(callbackUrls => callbackUrls.Value);
    }

    [Output("endpoint")]
public Output<string> Endpoint { get; set; }
}
