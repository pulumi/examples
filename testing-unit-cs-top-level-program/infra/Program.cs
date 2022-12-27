using System.IO;
using System.Collections.Generic;
using System.Runtime.CompilerServices;

using Pulumi;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;
using Pulumi.AzureNative.Storage.Inputs;

return await Pulumi.Deployment.RunAsync(Deploy.Infra);

class Deploy
{
   static string CurrentDir([CallerFilePath] string file = "") => Path.GetDirectoryName(file)!;

   public static Dictionary<string, object?> Infra()
   {
      var resourceGroup = new ResourceGroup("www-prod-rg", new()
      {
         Tags =  { ["Environment"] = "production" }
      });

      var storageAccount = new StorageAccount("wwwprodsa", new()
      {
         ResourceGroupName = resourceGroup.Name,
         Kind = Kind.BlobStorage,
         Sku = new SkuArgs { Name = SkuName.Standard_LRS }
      });

      // Enable static website support
      var staticWebsite = new StorageAccountStaticWebsite("staticWebsite", new()
      {
         AccountName = storageAccount.Name,
         ResourceGroupName = resourceGroup.Name,
         IndexDocument = "index.html",
      });
      
      var files = Directory.GetFiles(Path.Combine(CurrentDir(), "wwwroot"));

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

      // Export outputs here
      return new Dictionary<string, object?>
      {
         ["endpoint"] = storageAccount.PrimaryEndpoints.Apply(primaryEndpoints => primaryEndpoints.Web)
      };
   }
}
