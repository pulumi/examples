// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNextGen.Resources.Latest;
using Pulumi.AzureNextGen.Web.Latest;
using Pulumi.AzureNextGen.Web.Latest.Inputs;
using Pulumi.AzureNextGen.Insights.Latest;
using Pulumi.AzureNextGen.Sql.Latest;
using Pulumi.AzureNextGen.Storage.Latest;
using Pulumi.AzureNextGen.Storage.Latest.Inputs;

class AppServiceStack : Stack
{
    public AppServiceStack()
    {
        var resourceGroup = new ResourceGroup("appservice-rg", new ResourceGroupArgs
        {
            ResourceGroupName = "appservice-rg",
            Location = "westus2",
        });

        var storageAccount = new StorageAccount("sa", new StorageAccountArgs
        {
            AccountName = "appservicesa",
            ResourceGroupName = resourceGroup.Name,
            Kind = "StorageV2",
            Sku = new SkuArgs
            {
                Name = SkuName.Standard_LRS,
            },
        });

        var appServicePlan = new AppServicePlan("asp", new AppServicePlanArgs
        {
            Name = "asp",
            Location = resourceGroup.Location,
            ResourceGroupName = resourceGroup.Name,
            Kind = "App",
            Sku = new SkuDescriptionArgs
            {
                Tier = "Basic",
                Name = "B1",
            },
        });

        var container = new BlobContainer("zips", new BlobContainerArgs
        {
            AccountName = storageAccount.Name,
            ContainerName = "zips",
            PublicAccess = PublicAccess.None,
            ResourceGroupName = resourceGroup.Name,
        });

        var blob = new Blob("zip", new BlobArgs
        {
            BlobName = "appservice-blob",
            ResourceGroupName = resourceGroup.Name,
            AccountName = storageAccount.Name,
            ContainerName = container.Name,
            Type = BlobType.Block,
            Source = new FileArchive("wwwroot"),
        });

        var codeBlobUrl = signedBlobReadUrl(blob, container, storageAccount, resourceGroup);
        
        this.SignedURL = codeBlobUrl;

        var appInsights = new Component("appInsights", new ComponentArgs
        {
            Location = resourceGroup.Location,
            ApplicationType = "web",
            Kind = "web",
            ResourceGroupName = resourceGroup.Name,
            ResourceName = "appInsights",
        });

        var config = new Config();
        var username = config.Get("sqlAdmin") ?? "pulumi";
        var password = config.RequireSecret("sqlPassword");
        var sqlServer = new Server("sqlserver", new ServerArgs
        {
            ServerName = "insightssqlsrv1",
            Location = resourceGroup.Location,
            ResourceGroupName = resourceGroup.Name,
            AdministratorLogin = username,
            AdministratorLoginPassword = password,
            Version = "12.0",
        });

        var database = new Database("db", new DatabaseArgs
        {
            DatabaseName = "db",
            Location = resourceGroup.Location,
            ResourceGroupName = resourceGroup.Name,
            ServerName = sqlServer.Name,
            RequestedServiceObjectiveName = ServiceObjectiveName.S0,
        });

        var app = new WebApp("app", new WebAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            Name = "appserver-app",
            ServerFarmId = appServicePlan.Id,
            SiteConfig = new SiteConfigArgs
            {
                AppSettings = {
                    new NameValuePairArgs{
                        Name = "WEBSITE_RUN_FROM_PACKAGE",
                        Value = codeBlobUrl,
                    },
                    new NameValuePairArgs{
                        Name = "APPINSIGHTS_INSTRUMENTATIONKEY",
                        Value = appInsights.InstrumentationKey
                    },
                    new NameValuePairArgs{
                        Name = "APPLICATIONINSIGHTS_CONNECTION_STRING",
                        Value = appInsights.InstrumentationKey.Apply(key => $"InstrumentationKey={key}"),
                    },
                    new NameValuePairArgs{
                        Name = "ApplicationInsightsAgent_EXTENSION_VERSION",
                        Value = "~2",
                    },
                },
                ConnectionStrings = {
                    new ConnStringInfoArgs
                    {
                        Name = "db",
                        Type = ConnectionStringType.SQLAzure,
                        ConnectionString = Output.Tuple<string, string, string>(sqlServer.Name, database.Name, password).Apply(t =>
                        {
                            (string server, string database, string pwd) = t;
                            return
                                $"Server= tcp:{server}.database.windows.net;initial catalog={database};userID={username};password={pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;";
                        }),
                    },
                },
            }
        });

        this.Endpoint = app.DefaultHostName;
    }

    private static Output<string> SignedBlobReadUrl(Blob blob, BlobContainer container, StorageAccount account, ResourceGroup resourceGroup)
    {
        return Output.Tuple<string, string, string, string>(
            blob.Name, container.Name, account.Name, resourceGroup.Name).Apply(t =>
        {
            (string blobName, string containerName, string accountName, string resourceGroupName) = t;

            var blobSAS = ListStorageAccountServiceSAS.InvokeAsync(new ListStorageAccountServiceSASArgs
            {
                AccountName = accountName,
                Protocols = HttpProtocol.Https,
                SharedAccessStartTime = "2021-01-01",
                SharedAccessExpiryTime = "2030-01-01",
                Resource = SignedResource.C,
                ResourceGroupName = resourceGroupName,
                Permissions = Permissions.R,
                CanonicalizedResource = "/blob/" + accountName + "/" + containerName,
                ContentType = "application/json",
                CacheControl = "max-age=5",
                ContentDisposition = "inline",
                ContentEncoding = "deflate",
            });
            return Output.Format($"https://{accountName}.blob.core.windows.net/{containerName}/{blobName}?{blobSAS.Result.ServiceSasToken}");
        });
    }

    [Output] public Output<string> Endpoint { get; set; }
    [Output] public Output<string> SignedURL { get; set; }
}
