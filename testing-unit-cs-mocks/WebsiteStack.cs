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

        // Retrieve the primary storage account key, e.g. to build a connection string for
        // another resource that needs access to this storage account. This is a good example of
        // an `Invoke` (data source) call whose result contains a nested array of complex objects
        // - see WebsiteStackTests.cs and Testing.cs for how to mock it in unit tests.
        this.PrimaryStorageKey = GetPrimaryStorageKey(resourceGroup.Name, storageAccount.Name);
    }

    [Output] public Output<string> Endpoint { get; set; }

    [Output] public Output<string> PrimaryStorageKey { get; set; }

    private static Output<string> GetPrimaryStorageKey(Input<string> resourceGroupName, Input<string> accountName)
    {
        // Note: `ListStorageAccountKeys.InvokeAsync` is wrapped in `Output.Tuple(...).Apply(...)`
        // rather than using the `ListStorageAccountKeys.Invoke(...)` Output-returning overload,
        // since the latter can be unreliable when its arguments (here, `resourceGroupName` and
        // `accountName`) depend on other resources' outputs.
        var storageAccountKeys = Output.Tuple(resourceGroupName, accountName).Apply(t =>
        {
            var (rgName, saName) = t;
            return ListStorageAccountKeys.InvokeAsync(new ListStorageAccountKeysArgs
            {
                ResourceGroupName = rgName,
                AccountName = saName,
            });
        });

        return storageAccountKeys.Apply(keys => keys.Keys[0].Value);
    }
}

