// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.AppInsights;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Sql;
using Pulumi.Azure.Storage;

class AppServiceStack : Stack
{
    public AppServiceStack()
    {
        var resourceGroup = new ResourceGroup("appservice-rg");

        var storageAccount = new Account("sa", new AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountReplicationType = "LRS",
            AccountTier = "Standard",
        });

        var appServicePlan = new Plan("asp", new PlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Kind = "App",
            Sku = new PlanSkuArgs
            {
                Tier = "Basic",
                Size = "B1",
            },
        });

        var container = new Container("zips", new ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private",
        });

        var blob = new Blob("zip", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = container.Name,
            Type = "Block",
            Source = new FileArchive("wwwroot"),
        });

        var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

        var appInsights = new Insights("appInsights", new InsightsArgs
        {
            ApplicationType = "web",
            ResourceGroupName = resourceGroup.Name
        });

        var config = new Config();
        var username = config.Get("sqlAdmin") ?? "pulumi";
        var password = config.RequireSecret("sqlPassword");
        var sqlServer = new SqlServer("sql", new SqlServerArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AdministratorLogin = username,
            AdministratorLoginPassword = password,
            Version = "12.0",
        });

        var database = new Database("db", new DatabaseArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ServerName = sqlServer.Name,
            RequestedServiceObjectiveName = "S0",
        });

        var app = new AppService("app", new AppServiceArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AppServicePlanId = appServicePlan.Id,
            AppSettings =
            {
                {"WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl},
                {"APPINSIGHTS_INSTRUMENTATIONKEY", appInsights.InstrumentationKey},
                {"APPLICATIONINSIGHTS_CONNECTION_STRING", appInsights.InstrumentationKey.Apply(key => $"InstrumentationKey={key}")},
                {"ApplicationInsightsAgent_EXTENSION_VERSION", "~2"},
            },
            ConnectionStrings =
            {
                new AppServiceConnectionStringArgs
                {
                    Name = "db",
                    Type = "SQLAzure",
                    Value = Output.Tuple<string, string, string>(sqlServer.Name, database.Name, password).Apply(t =>
                    {
                        (string server, string database, string pwd) = t;
                        return
                            $"Server= tcp:{server}.database.windows.net;initial catalog={database};userID={username};password={pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;";
                    }),
                },
            },
        });

        this.Endpoint = app.DefaultSiteHostname;
    }

    [Output] public Output<string> Endpoint { get; set; }
}
