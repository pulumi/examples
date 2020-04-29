// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.Core;
using Pulumi.Azure.Storage;
using Pulumi.Azure.Storage.Inputs;

class StaticWebsite : Stack
{
    public StaticWebsite()
    {
        // Create an Azure Resource Group
        var resourceGroup = new ResourceGroup("mystaticsite");

        // Create an Azure Storage Account
        var storageAccount = new Account("mysite", new AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            EnableHttpsTrafficOnly = true,
            AccountReplicationType = "LRS",
            AccountTier = "Standard",
            AccountKind = "StorageV2",
            StaticWebsite = new AccountStaticWebsiteArgs
            {
                IndexDocument = "index.html"
            }
        });

        // Upload the files
        var files = new[] {"index.html", "404.html"};
        foreach (var file in files)
        {
            var uploadedFile = new Blob(file, new BlobArgs
            {
                Name = file,
                StorageAccountName = storageAccount.Name,
                StorageContainerName = "$web",
                Type = "Block",
                Source = new FileAsset($"./wwwroot/{file}"),
                ContentType = "text/html",
            });
        }

        // Export the Web address string for the storage account
        this.StaticEndpoint = storageAccount.PrimaryWebEndpoint;
    }

    [Output] public Output<string> StaticEndpoint { get; set; }
}
