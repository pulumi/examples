using Pulumi;
using Pulumi.Azure.AppInsights;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Storage;

namespace Azure.Functions.On.Linux.AppService
{
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

                Kind = "Linux",

                Sku = new PlanSkuArgs
                {
                    Tier = "PremiumV2",
                    Size = "P1v2"
                },

                // For Linux, you need to change the plan to have Reserved = true property.
                Reserved = true
            });

            var container = new Container("functions-zips", new ContainerArgs
            {
                StorageAccountName = storageAccount.Name,
                ContainerAccessType = "private"
            });

            var blob = new Blob("function-zip", new BlobArgs
            {
                StorageAccountName = storageAccount.Name,
                StorageContainerName = container.Name,
                Type = "Block",

                // The published folder contains a 'zip' file
                Source = new FileArchive("./functions/bin/Debug/netcoreapp3.1/publish")
            });

            var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

            var insights = new Insights("functions-ai", new InsightsArgs
            {
                ResourceGroupName = resourceGroup.Name,
                ApplicationType = "web"
            });

            var functionApp = new FunctionApp("functions-app", new FunctionAppArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AppServicePlanId = appServicePlan.Id,
                AppSettings =
                {
                    { "runtime", "dotnet" },
                    { "DOCKER_REGISTRY_SERVER_URL", "https://index.docker.io" },
                    { "WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl },

                    /*
                     * App Insights configuration will use the APPLICATIONINSIGHTS_CONNECTION_STRING app setting if it is set.
                     * APPINSIGHTS_INSTRUMENTATIONKEY is the fallback and continues to work as-is.
                     */
                    { "APPLICATIONINSIGHTS_CONNECTION_STRING", Output.Format($"InstrumentationKey={insights.InstrumentationKey}") }
                },

                StorageConnectionString = storageAccount.PrimaryConnectionString,

                // The settings below are to make sure a version 3 functionApp is created based on a 3.0 linux docker image
                Version = "~3",
                OsType = "linux",
                SiteConfig = new FunctionAppSiteConfigArgs
                {
                    LinuxFxVersion = "DOCKER|mcr.microsoft.com/azure-functions/dotnet:3.0"
                },
            });

            Endpoint = Output.Format($"https://{functionApp.DefaultHostname}/api/MyHttpTriggerFunction");
        }

        [Output]
        public Output<string> Endpoint { get; private set; }
    }
}