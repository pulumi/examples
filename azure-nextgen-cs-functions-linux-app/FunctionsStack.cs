// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNextGen.Insights.Latest;
using Pulumi.AzureNextGen.Web.Latest;
using Pulumi.AzureNextGen.Web.Latest.Inputs;
using Pulumi.AzureNextGen.Storage.Latest;
using Pulumi.AzureNextGen.Storage.Latest.Inputs;
using Pulumi.AzureNextGen.Resources.Latest;

class FunctionsStack : Stack
{
    public FunctionsStack()
    {
        var resourceGroup = new ResourceGroup("functions-rg", new ResourceGroupArgs { ResourceGroupName = "functions-rg" });

        var storageAccount = new StorageAccount("sa", new StorageAccountArgs
        {
            AccountName = "storageaccountfunc32215",
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuArgs
            {
                Name = SkuName.Standard_LRS,
            },
            Kind = Pulumi.AzureNextGen.Storage.Latest.Kind.StorageV2,
        });

        var appServicePlan = new AppServicePlan("functions-linux-asp", new AppServicePlanArgs
        {
            Name = "functions-linux-asp",
            ResourceGroupName = resourceGroup.Name,

            // Run on Linux
            Kind = "Linux",

            // Consumption plan SKU
            Sku = new SkuDescriptionArgs
            {
                Tier = "Dynamic",
                Name = "Y1"
            },

            // For Linux, you need to change the plan to have Reserved = true property.
            Reserved = true
        });

        var container = new BlobContainer("zips-container", new BlobContainerArgs
        {
            ContainerName = "zips-container",
            AccountName = storageAccount.Name,
            PublicAccess = PublicAccess.None,
            ResourceGroupName = resourceGroup.Name,
        });

        var blob = new Blob("zip", new BlobArgs
        {
            BlobName = "zip-blob",
            AccountName = storageAccount.Name,
            ContainerName = container.Name,
            ResourceGroupName = resourceGroup.Name,
            Type = BlobType.Block,
            Source = new FileArchive("./functions")
        });

        var codeBlobUrl = signedBlobReadUrl(blob, container, storageAccount, resourceGroup);

        // Application insights
        var appInsights = new Component("appInsights", new ComponentArgs
        {
            ApplicationType = ApplicationType.Web,
            Kind = "web",
            ResourceGroupName = resourceGroup.Name,
            ResourceName = "appInsights",
        });


        var app = new WebApp("app", new WebAppArgs
        {
            Name = "function-app-py",
            Kind = "FunctionApp",
            ResourceGroupName = resourceGroup.Name,
            ServerFarmId = appServicePlan.Id,
            SiteConfig = new SiteConfigArgs
            {
                AppSettings = new[]
                {
                    new NameValuePairArgs{
                        Name = "runtime",
                        Value = "python",
                    },
                    new NameValuePairArgs{
                        Name = "FUNCTIONS_WORKER_RUNTIME",
                        Value = "python",
                    },
                    new NameValuePairArgs{
                        Name = "WEBSITE_RUN_FROM_PACKAGE",
                        Value = codeBlobUrl,
                    },
                    new NameValuePairArgs{
                        Name = "APPLICATIONINSIGHTS_CONNECTION_STRING",
                        Value = Output.Format($"InstrumentationKey={appInsights.InstrumentationKey}"),
                    },
                },
            },
        });

        this.Endpoint = Output.Format($"https://{app.DefaultHostName}/api/Hello?name=Pulumi");
    }

    [Output] public Output<string> Endpoint { get; set; }

    private static Output<string> signedBlobReadUrl(Blob blob, BlobContainer container, StorageAccount account, ResourceGroup resourceGroup)
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
}
