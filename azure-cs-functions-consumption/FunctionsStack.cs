// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Storage;

class FunctionsStack : Stack
{
    public FunctionsStack()
    {
        var resourceGroup = new ResourceGroup("functions-rg");

        var storageAccount = new Account("sa", new AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountReplicationType = "LRS",
            AccountTier = "Standard"
        });

        var appServicePlan = new Plan("asp", new PlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Kind = "FunctionApp",
            Sku = new PlanSkuArgs
            {
                Tier = "Dynamic",
                Size = "Y1",
            }
        });

        var container = new Container("zips", new ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private"
        });

        var blob = new Blob("zip", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = container.Name,
            Type = "Block",
            Source = new FileArchive("./functions/bin/Debug/netcoreapp3.1/publish")
        });

        var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

        var app = new FunctionApp("app", new FunctionAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AppServicePlanId = appServicePlan.Id,
            AppSettings =
            {
                {"runtime", "dotnet"},
                {"WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl},
            },
            StorageAccountName = storageAccount.Name,
            StorageAccountAccessKey = storageAccount.PrimaryAccessKey,
            Version = "~3"
        });

        this.Endpoint = Output.Format($"https://{app.DefaultHostname}/api/Hello?name=Pulumi");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
