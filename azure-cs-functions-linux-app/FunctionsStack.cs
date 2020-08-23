// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.AppInsights;
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

        var appServicePlan = new Plan("functions-linux-asp", new PlanArgs
        {
            ResourceGroupName = resourceGroup.Name,

            // Run on Linux
            Kind = "Linux",

            // Premium SKU
            Sku = new PlanSkuArgs
            {
                Tier = "PremiumV2",
                Size = "P1v2"
            },

            // For Linux, you need to change the plan to have Reserved = true property.
            Reserved = true
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
            Source = new FileArchive("./functions")
        });

        var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);
        
        // Application insights
        var insights = new Insights("functions-ai", new InsightsArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ApplicationType = "web"
        });

        var app = new FunctionApp("app", new FunctionAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AppServicePlanId = appServicePlan.Id,
            AppSettings =
            {
                {"runtime", "python"},
                {"FUNCTIONS_WORKER_RUNTIME", "python"},
                {"WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl},
                {"APPLICATIONINSIGHTS_CONNECTION_STRING", Output.Format($"InstrumentationKey={insights.InstrumentationKey}")}
            },
            StorageAccountName = storageAccount.Name,
            StorageAccountAccessKey = storageAccount.PrimaryAccessKey,
            Version = "~3",
            OsType = "linux",
            SiteConfig = new FunctionAppSiteConfigArgs
            {
                AlwaysOn = true,
                LinuxFxVersion = "DOCKER|mcr.microsoft.com/azure-functions/python:2.0"
            }
        });

        this.Endpoint = Output.Format($"https://{app.DefaultHostname}/api/Hello?name=Pulumi");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
