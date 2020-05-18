// Copyright 2016-2020, Pulumi Corporation

using System.IO;
using Pulumi;
using Pulumi.Azure.Core;
using Storage = Pulumi.Azure.Storage;

public class WebsiteStack : Stack
{
    public WebsiteStack()
    {
        var resourceGroup = new ResourceGroup("www-prod-rg", new ResourceGroupArgs
        {
            Tags = { { "Environment", "production" } }
        });
        
        var storageAccount = new Storage.Account("wwwprodsa", new Storage.AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountTier = "Standard",
            AccountReplicationType = "LRS",
            StaticWebsite = new Storage.Inputs.AccountStaticWebsiteArgs
            {
                IndexDocument = "index.html"
            }
        });
        
        var files = Directory.GetFiles("wwwroot");
        foreach (var file in files)
        {
            var blob = new Storage.Blob(file, new Storage.BlobArgs
            {
                ContentType = "application/html",
                Source = new FileAsset(file),
                StorageAccountName = storageAccount.Name,
                StorageContainerName = "$web",
                Type = "Block"
            });
        }
        
        this.Endpoint = storageAccount.PrimaryWebEndpoint;
    }

    [Output] public Output<string> Endpoint { get; set; }
}

