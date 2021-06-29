// Copyright 2016-2020, Pulumi Corporation

using System.IO;
using Pulumi;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;
using Pulumi.AzureNative.Storage.Inputs;

public class WebsiteStack : Stack
{
    public WebsiteStack()
    {
        var resourceGroup = new ResourceGroup("www-prod-rg", new ResourceGroupArgs
        {
            Tags = { { "Environment", "production" } }
        });
        
        var storageAccount = new StorageAccount("wwwprodsa", new StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuArgs
            {
                Name = SkuName.Standard_LRS
            },
            Kind = Kind.BlobStorage
        });

        // Enable static website support
        var staticWebsite = new StorageAccountStaticWebsite("staticWebsite", new StorageAccountStaticWebsiteArgs
        {
            AccountName = storageAccount.Name,
            ResourceGroupName = resourceGroup.Name,
            IndexDocument = "index.html",
        });
        
        var files = Directory.GetFiles("wwwroot");
        foreach (var file in files)
        {
            var blob = new Blob(file, new BlobArgs
            {
                ContentType = "application/html",
                Source = new FileAsset(file),
                ResourceGroupName = resourceGroup.Name,
                AccountName = storageAccount.Name,
                ContainerName = staticWebsite.ContainerName,
            });
        }
        
        this.Endpoint = storageAccount.PrimaryEndpoints.Apply(
            primaryEndpoints => primaryEndpoints.Web);
    }

    [Output] public Output<string> Endpoint { get; set; }
}

