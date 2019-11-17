// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Storage;
using Pulumi.AzureAD;
using System.Collections.Generic;
using System.Threading.Tasks;

class Program
{
    static Task<int> Main(string[] args)
    {
        return Deployment.RunAsync(() =>
        {
            var config = new Config();
            var botName = config.Require("botName");
            var botSecret = config.GetSecret("botSecret");

            var resourceGroup = new ResourceGroup("botservice-rg", new ResourceGroupArgs
            {
            });

            var storageAccount = new Pulumi.Azure.Storage.Account("sa", new Pulumi.Azure.Storage.AccountArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AccountReplicationType = "LRS",
                AccountTier = "Standard"
            });

            var appServicePlan = new Plan("asp", new PlanArgs
            {
                ResourceGroupName = resourceGroup.Name,
                Kind = "App",
                Sku = new PlanSkuArgs
                {
                    Tier = "Basic",
                    Size = "B1"
                },
            });

            var container = new Container("zips", new ContainerArgs
            {
                StorageAccountName = storageAccount.Name,
                ContainerAccessType = "private",
            });

            var blob = new ZipBlob("zip", new ZipBlobArgs
            {
                StorageAccountName = storageAccount.Name,
                StorageContainerName = container.Name,
                Type = "block",
                Content = new FileArchive("bot/bot.zip")
            });

            var codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount);

            var appInsights = new Pulumi.Azure.AppInsights.Insights("ai", new Pulumi.Azure.AppInsights.InsightsArgs
            {
                ApplicationType = "web",
                ResourceGroupName = resourceGroup.Name
            });

            var appInsightApiKey = new Pulumi.Azure.AppInsights.ApiKey("ai", new Pulumi.Azure.AppInsights.ApiKeyArgs
            {
                ApplicationInsightsId = appInsights.Id,
                //ApplicationInsightsId = appInsights.Id.Apply(ai => ai),
                ReadPermissions = "api",
            });

            var luis = new Pulumi.Azure.Cognitive.Account("cs", new Pulumi.Azure.Cognitive.AccountArgs
            {
                Kind = "CognitiveServices", // includes LUIS
                ResourceGroupName = resourceGroup.Name,
                Sku = new Pulumi.Azure.Cognitive.Inputs.AccountSkuArgs() { Name = "S0", Tier = "Standard" }
            });

            var msa = new Application("msapp", new ApplicationArgs
            {
                Oauth2AllowImplicitFlow = false,
                //Oauth2Permissions = null,
                AvailableToOtherTenants = true,
                PublicClient = true
            });

            var msaSecret = new ApplicationPassword("msapp", new ApplicationPasswordArgs
            {
                ApplicationObjectId = msa.ObjectId,
                EndDateRelative = "8640h",
                //EndDate = DateTime.Now.AddYears(1).ToUniversalTime().ToString("o"),
                Value = botSecret
                //Value = "sbc!ABD@1234-1234234adfasdfasdf"
            });

            var app = new AppService("app", new AppServiceArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AppServicePlanId = appServicePlan.Id,
                AppSettings =
                {
                    { "WEBSITE_RUN_FROM_PACKAGE", codeBlobUrl },
                    { "MicrosoftAppId", msa.ApplicationId },
                    { "MicrosoftAppPassword", msaSecret.Value },
                    { "LuisApiKey", luis.PrimaryAccessKey },
                },
                HttpsOnly = true
            });

            var bot = new Pulumi.Azure.Bot.WebApp(botName, new Pulumi.Azure.Bot.WebAppArgs
            {
                DisplayName = botName,
                MicrosoftAppId = msa.ApplicationId,
                ResourceGroupName = resourceGroup.Name,
                Sku = "F0",
                Location = "global",
                Endpoint = app.DefaultSiteHostname.Apply(a => $"https://{a}/api/messages"),
                DeveloperAppInsightsApiKey = appInsightApiKey.Key,
                //DeveloperAppInsightsApiKey = appInsightApiKey.Key.Apply(k => k),
                DeveloperAppInsightsApplicationId = appInsights.AppId,
                DeveloperAppInsightsKey = appInsights.InstrumentationKey
            });

            return new Dictionary<string, object>
            {
                { "Bot Endpoint", Output.Format($"https://{app.DefaultSiteHostname}/api/messages") },
                { "MicrosoftAppId", Output.Format($"{msa.ApplicationId}") }
            };
        });
    }
}