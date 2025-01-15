// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.AppInsights;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Bot;
using Pulumi.Azure.Core;
using Pulumi.AzureAD;
using Pulumi.AzureAD.Inputs;
using Pulumi.Random;
using Cognitive = Pulumi.Azure.Cognitive;
using Storage = Pulumi.Azure.Storage;

class BotStack : Stack
{
    public BotStack()
    {
        var config = new Pulumi.Config();
        var botName = config.Require("botName");

        var resourceGroup = new ResourceGroup("botservice-rg");

        var storageAccount = new Storage.Account("sa", new Storage.AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountReplicationType = "LRS",
            AccountTier = "Standard"
        });

        var appServicePlan = new ServicePlan("asp", new ServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            OsType = "Linux",
            SkuName = "B1",
        });

        var container = new Storage.Container("zips", new Storage.ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private",
        });

        var blob = new Storage.Blob("zip", new Storage.BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = container.Name,
            Type = "Block",
            Source = new FileArchive("bot/publish")
        });

        var codeBlobUrl = Storage.SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

        var appInsights = new Insights("ai", new InsightsArgs
        {
            ApplicationType = "web",
            ResourceGroupName = resourceGroup.Name
        });

        var appInsightApiKey = new ApiKey("ai", new ApiKeyArgs
        {
            ApplicationInsightsId = appInsights.Id,
            ReadPermissions = "api",
        });

        var luis = new Cognitive.Account("cs", new Cognitive.AccountArgs
        {
            Kind = "CognitiveServices", // includes LUIS
            ResourceGroupName = resourceGroup.Name,
            SkuName = "S0"
        });

        var msa = new Application("msapp", new ApplicationArgs
        {
            PublicClient = new ApplicationPublicClientArgs
            {
                RedirectUris =
                {
                    "https://address1.com",
                },
            },
            FallbackPublicClientEnabled = true,
            DisplayName = "msapp"
        });

        var msaSecret = new ApplicationPassword("msasecret", new Pulumi.AzureAD.ApplicationPasswordArgs
        {
            ApplicationId = msa.Id,
        });

        var app = new LinuxWebApp("app", new LinuxWebAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ServicePlanId = appServicePlan.Id,
            AppSettings =
            {
                {"WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl},
                {"MicrosoftAppId", msa.Id},
                {"MicrosoftAppPassword", msaSecret.Value},
                {"LuisApiKey", luis.PrimaryAccessKey},
            },
            HttpsOnly = true,
            SiteConfig = new LinuxWebAppSiteConfigArgs { },
        });

        var bot = new WebApp(botName, new WebAppArgs
        {
            DisplayName = botName,
            MicrosoftAppId = msa.Id,
            ResourceGroupName = resourceGroup.Name,
            Sku = "F0",
            Location = "global",
            Endpoint = Output.Format($"https://{app.DefaultHostname}/api/messages"),
            DeveloperAppInsightsApiKey = appInsightApiKey.Key,
            DeveloperAppInsightsApplicationId = appInsights.AppId,
            DeveloperAppInsightsKey = appInsights.InstrumentationKey
        });

        this.BotEndpoint = bot.Endpoint;
        this.MicrosoftAppId = msa.Id;
        this.MicrosoftAppPassword = msaSecret.Value;
    }

    [Output] public Output<string?> BotEndpoint { get; set; }

    [Output] public Output<string> MicrosoftAppId { get; set; }

    [Output] public Output<string> MicrosoftAppPassword { get; set; }
}
