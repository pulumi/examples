// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

using System;
using Pulumi;
using AzureNative = Pulumi.AzureNative;
using Resources = Pulumi.AzureNative.Resources;
using Sql = Pulumi.AzureNative.Sql;
using Pulumi.Random;

class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new Resources.ResourceGroup("resourceGroup");        

        var password = new Pulumi.Random.RandomPassword("admin-password", new Pulumi.Random.RandomPasswordArgs { Length = 20 });
        
        Sql.Server server = new Sql.Server(
            "server",
            new Sql.ServerArgs
            {
                AdministratorLogin = "admin-user",
                AdministratorLoginPassword = password.Result,                
                ResourceGroupName = resourceGroup.Name,
                ServerName = $"{Pulumi.Deployment.Instance.StackName}",                
                MinimalTlsVersion = "1.2",
                PublicNetworkAccess = "Enabled"
            });

            this.ServerName = server.Name.Apply(servername => $"{servername}.database.windows.net");

            Sql.Database database = new Sql.Database(
            "db",
            new Sql.DatabaseArgs
            {
                DatabaseName = "database",
                ServerName = server.Name,
                Collation = "SQL_Latin1_General_CP1_CI_AI",
                ResourceGroupName = resourceGroup.Name,                                
                Sku = new AzureNative.Sql.Inputs.SkuArgs
                    {
                        Capacity = 2,
                        Family = "Gen5",
                        Name = "GP_S", /*Serverless*/
                    }                
            });           
    }

    [Output("serverName")]
    public Output<string> ServerName { get; set; }   

}
