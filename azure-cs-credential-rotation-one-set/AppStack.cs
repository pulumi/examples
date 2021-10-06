// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System;
using Pulumi;
using Pulumi.AzureNative.Authorization;
using Pulumi.AzureNative.EventGrid.Inputs;
using Pulumi.AzureNative.EventGrid;
using Pulumi.AzureNative.Insights;
using Pulumi.AzureNative.KeyVault;
using Pulumi.AzureNative.KeyVault.Inputs;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Sql;
using Pulumi.AzureNative.Storage;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using Pulumi.Random;
using KeyVault = Pulumi.AzureNative.KeyVault;
using Storage = Pulumi.AzureNative.Storage;
using ManagedServiceIdentityType = Pulumi.AzureNative.Web.ManagedServiceIdentityType;

internal class AppStack : Stack
{
    [Output]
    public Output<string> WebAppEndpoint { get; set; }

    public AppStack()
    {
        var config = new Config();

        var resourceGroup = new ResourceGroup("rotatesecretoneset-rg");

        var sqlAdminLogin = config.Get("sqlAdminLogin") ?? "sqlAdmin";
        var sqlAdminPassword = new RandomUuid("sqlPassword").Result;
        var sqlServer = new Server("sqlServer", new ServerArgs
        {
            AdministratorLogin = sqlAdminLogin,
            AdministratorLoginPassword = sqlAdminPassword,
            ResourceGroupName = resourceGroup.Name,
            Version = "12.0",
        });

        new FirewallRule("AllowAllWindowsAzureIps",
            new FirewallRuleArgs
            {
                ServerName = sqlServer.Name,
                ResourceGroupName = resourceGroup.Name,
                StartIpAddress = "0.0.0.0",
                EndIpAddress = "0.0.0.0",
            });

        var clientConfig = Output.Create(GetClientConfig.InvokeAsync());
        var tenantId = clientConfig.Apply(c => c.TenantId);

        var storageAccount = new StorageAccount("storageaccount", new StorageAccountArgs
        {
            Kind = "Storage",
            ResourceGroupName = resourceGroup.Name,
            Sku = new Storage.Inputs.SkuArgs
            {
                Name = "Standard_LRS"
            },
        });

        var appInsights = new Component("appInsights", new ComponentArgs
        {
            RequestSource = "IbizaWebAppExtensionCreate",
            ResourceGroupName = resourceGroup.Name,
            ApplicationType = "web",
            Kind = "web",
            Tags =
            {
                //{ "[concat('hidden-link:', resourceId('Microsoft.Web/sites', parameters('functionAppName')))]", "Resource" },
            },
        });

        var secretName = config.Get("secretName") ?? "sqlPassword";
        var appService = new AppServicePlan("functionApp-appService", new AppServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuDescriptionArgs
            {
                Name = "Y1",
                Tier = "Dynamic",
            },
        });

        var storageKey = ListStorageAccountKeys.Invoke(new ListStorageAccountKeysInvokeArgs
        {
            AccountName = storageAccount.Name,
            ResourceGroupName = resourceGroup.Name
        }).Apply(t => t.Keys[0].Value);

        var functionApp = new WebApp("functionApp", new WebAppArgs
        {
            Kind = "functionapp",
            ResourceGroupName = resourceGroup.Name,
            ServerFarmId = appService.Id,
            Identity = new ManagedServiceIdentityArgs { Type = ManagedServiceIdentityType.SystemAssigned },
            SiteConfig = new SiteConfigArgs
            {
                AppSettings =
                {
                    new NameValuePairArgs
                    {
                        Name = "AzureWebJobsStorage",
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccount.Name};AccountKey={storageKey}"),
                    },
                    new NameValuePairArgs
                    {
                        Name = "FUNCTIONS_EXTENSION_VERSION",
                        Value = "~3",
                    },
                    new NameValuePairArgs
                    {
                        Name = "FUNCTIONS_WORKER_RUNTIME",
                        Value = "dotnet",
                    },
                    new NameValuePairArgs
                    {
                        Name = "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccount.Name};EndpointSuffix=core.windows.net;AccountKey={storageKey}"),
                    },
                    new NameValuePairArgs
                    {
                        Name = "WEBSITE_NODE_DEFAULT_VERSION",
                        Value = "~10",
                    },
                    new NameValuePairArgs
                    {
                        Name = "APPINSIGHTS_INSTRUMENTATIONKEY",
                        Value = appInsights.InstrumentationKey,
                    },
                },
            },
        });

        var functionAppSourceControl = new WebAppSourceControl("functionApp-sourceControl",
            new WebAppSourceControlArgs
            {
                Name = functionApp.Name,
                IsManualIntegration = true,
                Branch = "main",
                RepoUrl = config.Get("functionAppRepoURL") ?? "https://github.com/Azure-Samples/KeyVault-Rotation-SQLPassword-Csharp.git",
                ResourceGroupName = resourceGroup.Name,
            });

        var webAppAppService = new AppServicePlan("webApp-appService", new AppServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuDescriptionArgs
            {
                Name = "F1",
            },
        });

        var webApp = new WebApp("webApp", new WebAppArgs
        {
            Kind = "app",
            ResourceGroupName = resourceGroup.Name,
            ServerFarmId = webAppAppService.Id,
            Identity = new ManagedServiceIdentityArgs { Type = ManagedServiceIdentityType.SystemAssigned },
        });

        var keyVault = new Vault("keyVault", new VaultArgs
        {
            Properties = new VaultPropertiesArgs
            {
                AccessPolicies =
                {
                    new AccessPolicyEntryArgs
                    {
                        TenantId = tenantId,
                        ObjectId = functionApp.Identity.Apply(i => i!.PrincipalId),
                        Permissions = new PermissionsArgs
                        {
                            Secrets = { "get", "list", "set" },
                        },
                    },
                    new AccessPolicyEntryArgs
                    {
                        TenantId = tenantId,
                        ObjectId = webApp.Identity.Apply(i => i!.PrincipalId),
                        Permissions = new PermissionsArgs
                        {
                            Secrets = { "get", "list", "set" },
                        },
                    },
                },
                EnabledForDeployment = false,
                EnabledForDiskEncryption = false,
                EnabledForTemplateDeployment = false,
                Sku = new SkuArgs
                {
                    Family = "A",
                    Name = KeyVault.SkuName.Standard,
                },
                TenantId = tenantId,
                EnableSoftDelete = false,   // NOTE: This should be enabled in production.
            },
            ResourceGroupName = resourceGroup.Name,
        });

        var topicName = "SecretExpiry";
        var topic = new SystemTopic(topicName,
            new SystemTopicArgs
            {
                Source = keyVault.Id,
                TopicType = "microsoft.keyvault.vaults",
                ResourceGroupName = resourceGroup.Name,
            });

        var eventSubscription = new SystemTopicEventSubscription("eventSubscription",
            new SystemTopicEventSubscriptionArgs
            {
                SystemTopicName = topic.Name,
                ResourceGroupName = resourceGroup.Name,
                Filter = new EventSubscriptionFilterArgs
                {
                    SubjectBeginsWith = secretName,
                    SubjectEndsWith = secretName,
                    IncludedEventTypes = { "Microsoft.KeyVault.SecretNearExpiry" },
                },
                Destination = new AzureFunctionEventSubscriptionDestinationArgs
                {
                    ResourceId = Output.Format($"{functionApp.Id}/functions/AKVSQLRotation"),
                    EndpointType = "AzureFunction",
                    MaxEventsPerBatch = 1,
                    PreferredBatchSizeInKilobytes = 64,
                },
            },
            new CustomResourceOptions { DependsOn = { functionAppSourceControl } });

        var expiresAt = DateTimeOffset.Now.AddMinutes(1).ToUnixTimeSeconds();
        var secret = new Secret("secret",
            new SecretArgs
            {
                SecretName = secretName,
                VaultName = keyVault.Name,
                ResourceGroupName = resourceGroup.Name,
                Tags = { { "CredentialId", sqlAdminLogin }, { "ProviderAddress", sqlServer.Id }, { "ValidityPeriodDays", "1" } },
                Properties = new SecretPropertiesArgs
                {
                    Value = sqlAdminPassword,
                    Attributes = new SecretAttributesArgs { Expires = (int)expiresAt },
                },
            },
            new CustomResourceOptions { DependsOn = { eventSubscription } });

        new WebAppApplicationSettings("webApp-appSettings",
            new WebAppApplicationSettingsArgs
            {
                Name = webApp.Name,
                ResourceGroupName = resourceGroup.Name,
                Properties =
                {
                    { "DataSource", Output.Format($"{sqlServer.Name}.database.windows.net") },
                    { "KeyVaultName", keyVault.Name },
                    { "SecretName", secretName },
                },
            });

        this.WebAppEndpoint = webApp.DefaultHostName;

        new WebAppSourceControl("webApp-sourceControl",
            new WebAppSourceControlArgs
            {
                Name = webApp.Name,
                IsManualIntegration = true,
                Branch = "main",
                RepoUrl = config.Get("webAppRepoURL") ?? "https://github.com/Azure-Samples/KeyVault-Rotation-SQLPassword-Csharp-WebApp.git",
                ResourceGroupName = resourceGroup.Name,
            });
    }
}
