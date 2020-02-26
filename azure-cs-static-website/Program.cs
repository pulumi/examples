using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Azure.Storage;
using Microsoft.Azure.Storage.Blob;
using Microsoft.Azure.Storage.Shared.Protocol;
using Pulumi;
using Pulumi.Azure.Core;
using Pulumi.Azure.Storage;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() => {

            // Create an Azure Resource Group
            var resourceGroup = new ResourceGroup("mystaticsite");

            // Create an Azure Storage Account
            var storageAccount = new Account("mysite", new AccountArgs
            {
                ResourceGroupName = resourceGroup.Name,
                EnableHttpsTrafficOnly = true,
                AccountReplicationType = "LRS",
                AccountTier = "Standard",
                AccountKind = "StorageV2"
            });

            // We can't enable static sites using Pulumi (it's not exposed in the ARM API).
            // Therefore we have to invoke the Azure SDK from within the Pulumi code to enable the static sites 
            // The code in the Apply method must be idempotent.
            var containerName  = storageAccount.PrimaryBlobConnectionString.Apply(async v => await EnableStaticSites(v) );
        
            // Upload the files
            var files =  new[]{"index.html", "404.html"};
            foreach (var file in files)
            {
                var uploadedFile = new Blob(file, new BlobArgs
                {
                    Name = file,
                    StorageAccountName = storageAccount.Name,
                    StorageContainerName =containerName,
                    Type = "Block",
                    Source = $"./wwwroot/{file}",
                    ContentType = "text/html",
                });
            }
            
            // Export the Web address string for the storage account
            return new Dictionary<string, object>
            {
                { "staticEndpoint", storageAccount.PrimaryWebEndpoint },
            };
        });


        static async Task<string> EnableStaticSites(string connectionString)
        {
	        if (!Deployment.Instance.IsDryRun)
	        {
		        var sa = CloudStorageAccount.Parse(connectionString);

		        var blobClient = sa.CreateCloudBlobClient();
		        var blobServiceProperties = new ServiceProperties
		        {
			        StaticWebsite = new StaticWebsiteProperties
			        {
				        Enabled = true,
				        IndexDocument = "index.html",
				        ErrorDocument404Path = "404.html"
			        }
		        };
		        await blobClient.SetServicePropertiesAsync(blobServiceProperties);
	        }

	        return "$web";
        }
    }
}
