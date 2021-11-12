// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Pulumi;
using Pulumi.AzureNative.DocumentDB;
using Pulumi.AzureNative.DocumentDB.Inputs;

public class CosmosDBMongoDB : ComponentResource
{
    public Output<string> AccountName { get; set; }

    public Output<string> DatabaseName { get; set; }

    public CosmosDBMongoDB(string name, CosmosDBMongoDBArgs args)
        : base("example:component:CosmosDBMongoDB", name)
    {
        var config = new Config("azure-native");
        var location = config.Require("location");

        var databaseAccount = new DatabaseAccount("cosmos-mongodb", new DatabaseAccountArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            DatabaseAccountOfferType = DatabaseAccountOfferType.Standard,
            Kind = DatabaseAccountKind.MongoDB,
            ConsistencyPolicy = new ConsistencyPolicyArgs
            {
                DefaultConsistencyLevel = DefaultConsistencyLevel.BoundedStaleness,
                MaxIntervalInSeconds = 10,
                MaxStalenessPrefix = 200,
            },
            Locations =
            {
                new LocationArgs
                {
                    FailoverPriority = 0,
                    LocationName = location
                }
            }
        }, new CustomResourceOptions { Parent = this });
        this.AccountName = databaseAccount.Name;

        var database = new MongoDBResourceMongoDBDatabase(args.DatabaseName, new MongoDBResourceMongoDBDatabaseArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            AccountName = databaseAccount.Name,
            Resource = new MongoDBDatabaseResourceArgs { Id = args.DatabaseName }
        }, new CustomResourceOptions { Parent = this });
        this.DatabaseName = database.Name;
    }

    public static Output<ImmutableDictionary<string, string>> KubernetesSecretData(Output<string> resourceGroupName, Output<string> accountName, Output<string> databaseName)
    {
        var connString = ListDatabaseAccountConnectionStrings.Invoke(
            new ListDatabaseAccountConnectionStringsInvokeArgs
            {
                ResourceGroupName = resourceGroupName,
                AccountName = accountName
            }).Apply(conn => conn.ConnectionStrings[0].ConnectionString);

        return connString.Apply(connString => databaseName.Apply(databaseName => parseConnString(connString, databaseName)));
    }

    private static ImmutableDictionary<string, string> parseConnString(string conn, string database)
    {
        // Per the official docs[1], the format of this connection string is:
        //
        //   mongodb://username:password@host:port/[database]?ssl=true
        //
        // For instance:
        //
        //   mongodb://cosmos-mongodb965c15ec:9mrcqzY98o53WiehJ9FZncTS4auyU2BUG6E2Aq9kn8PUi6XsISj6fVhJJXGzfTpZcFGsgIzKw1unveMMQW8Mtw==@cosmos-mongodb965c15ec.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@cosmos-mongodb965c15ec@
        //
        // Where these could have the following values:
        //
        //   {
        //     username: "cosmosdb93a4133a",
        //     password: "23maXrWsrzZ1LmPe4w6XNGRJJTHsqGZPDTjyVQNbPaw119KCoCNpStH0DQms5MKdyAecisBM9uWbpV7lUnyNeQ==",
        //     host: "cosmosdb93a4133a.documents.azure.com",
        //     port: "10255",
        //     database: "mydatabase"
        //   }
        //
        // There are a few subtleties involved in getting the Bitnami node Chart to actually be able to
        // use this:
        //
        //   1. The `database` field is optional, we default to `test`, as the API expects.
        //   2. The node Chart expects the components of this connection string to be parsed and
        //      presented in files in a `Secret`. The CosmosDb API doesn't natively expose this, so we
        //      must parse it ourselves.
        //   3. The node Chart uses mongoose to speak the MongoDB wire protocol to CosmosDB. Mongoose
        //      fails to parse base64-encoded passwords because it doesn't like the `=` character. This
        //      means we have to (1) URI-encode the password component ourselves, and (2) base64-encode
        //      that URI-encoded password, because this is the format Kubernetes expects.
        //
        // [1]: https://docs.microsoft.com/en-us/azure/cosmos-db/connect-mongodb-account

        var noProtocol = conn.Replace("mongodb://", "");
        var parts = noProtocol.Split(":", 3);
        var userName = parts[0];
        var subParts = parts[1].Split("@", 2);
        var (password, host) = (subParts[0], subParts[1]);
        var port = parts[2].Split("/", 2)[0];
        return new Dictionary<string, string>
        {
            {"host", toBase64(host)},
            {"port", toBase64(port)},
            {"username", toBase64(userName)},
            {"password", toBase64(Uri.EscapeDataString(password))},
            {"database", toBase64(database)},
        }.ToImmutableDictionary();

        static string toBase64(string plainText)
        {
            var plainTextBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
            return System.Convert.ToBase64String(plainTextBytes);
        }
    }
}

public class CosmosDBMongoDBArgs
{
    public Input<string> ResourceGroupName { get; set; }
    public string DatabaseName { get; set; }
}
