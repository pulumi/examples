using Pulumi;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;
using Pulumi.AzureNative.Storage.Inputs;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using System;

class MainStack : Stack
{
    public MainStack()
    {
        // Create an Azure Resource Group
        var resourceGroup = new ResourceGroup("BlazorApp");

        // Create storage account
        var storageAccount = new StorageAccount("storage", new StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuArgs
            {
                Name = SkuName.Standard_LRS
            },
            Kind = Kind.StorageV2
        });

        // Add blob container to storage account
        var container = new BlobContainer("deploymentzips", new BlobContainerArgs
        {
            AccountName = storageAccount.Name,
            PublicAccess = PublicAccess.None,
            ResourceGroupName = resourceGroup.Name,
        });

        // Create a zip of the app's publish output and upload it to the blob container
        var blob = new Blob("BlazorServer.zip", new BlobArgs
        {
            AccountName = storageAccount.Name,
            ContainerName = container.Name,
            ResourceGroupName = resourceGroup.Name,
            Type = BlobType.Block,
            Source = new FileArchive($"..\\BlazorApp.BlazorServer\\bin\\Debug\\net6.0\\publish") // This path should be set to the output of `dotnet publish` command. See https://docs.microsoft.com/en-us/azure/app-service/deploy-run-package#create-a-project-zip-package
        });

        // Generate SAS url for the app output zip in storage
        var deploymentZipBlobSasUrl = SignedBlobReadUrl(blob, container, storageAccount, resourceGroup);

        // Create app service plan for app
        var appServicePlan = new AppServicePlan("appserviceplan", new AppServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuDescriptionArgs
            {
                Tier = "Shared",
                Name = "D1"
            }
        });

        // Create app service. Set WEBSITE_RUN_FROM_PACKAGE to use the zip in storage
        var app = new WebApp($"blazorserverappservice", new WebAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ServerFarmId = appServicePlan.Id,
            SiteConfig = new SiteConfigArgs
            {
                AppSettings = new[]
                {
                    new NameValuePairArgs{
                        Name = "WEBSITE_RUN_FROM_PACKAGE",
                        Value = deploymentZipBlobSasUrl,
                    }
                },
            },
        });

        // Output the app service url
        this.AppServiceUrl = Output.Format($"https://{app.DefaultHostName}");
    }

    [Output]
    public Output<string> AppServiceUrl { get; set; }

    public static Output<string> SignedBlobReadUrl(Blob blob, BlobContainer container, StorageAccount account, ResourceGroup resourceGroup)
    {
        return Output.Tuple(blob.Name, container.Name, account.Name, resourceGroup.Name)
            .Apply(t =>
            {
                (string blobName, string containerName, string accountName, string resourceGroupName) = t;

                var blobSAS = ListStorageAccountServiceSAS.InvokeAsync(new ListStorageAccountServiceSASArgs
                {
                    AccountName = accountName,
                    Protocols = HttpProtocol.Https,
                    SharedAccessStartTime = DateTime.Now.Subtract(new TimeSpan(365, 0, 0, 0)).ToString("yyyy-MM-dd"),
                    SharedAccessExpiryTime = DateTime.Now.AddDays(3650).ToString("yyyy-MM-dd"),
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
