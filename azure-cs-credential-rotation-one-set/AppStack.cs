// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System;
using Pulumi;
using Pulumi.AzureNextGen.Authorization.Latest;
using Pulumi.AzureNextGen.EventGrid.V20200401Preview.Inputs;
using Pulumi.AzureNextGen.EventGrid.V20200401Preview;
using Pulumi.AzureNextGen.Insights.Latest;
using Pulumi.AzureNextGen.KeyVault.Latest;
using Pulumi.AzureNextGen.KeyVault.Latest.Inputs;
using Pulumi.AzureNextGen.Resources.Latest;
using Pulumi.AzureNextGen.Sql.Latest;
using Pulumi.AzureNextGen.Storage.Latest;
using Pulumi.AzureNextGen.Web.Latest;
using Pulumi.AzureNextGen.Web.Latest.Inputs;
using KeyVault = Pulumi.AzureNextGen.KeyVault.Latest;
using Storage = Pulumi.AzureNextGen.Storage.Latest;

internal class AppStack : Stack
{
    public AppStack()
    {
        var config = new Config();
        var resourceGroupName = config.Require("resourceGroupNameParam");
        var resourceGroup = Output.Create(GetResourceGroup.InvokeAsync(new GetResourceGroupArgs
        {
            ResourceGroupName = resourceGroupName,
        }));

        var resourceNamePrefix = Output.Create(config.Get("resourceNamePrefixParam")) ?? resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Name)!;
        var sqlAdminLogin = config.Get("sqlAdminLoginParam") ?? "sqlAdmin";
        var sqlAdminPassword = Guid.NewGuid().ToString();
        var location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location);
        var sqlServer = new Server("serverResource", new ServerArgs
        {
            AdministratorLogin = sqlAdminLogin,
            AdministratorLoginPassword = sqlAdminPassword,
            Location = location,
            ResourceGroupName = resourceGroupName,
            ServerName = Output.Format($"{resourceNamePrefix}-sql"),
            Version = "12.0",
        });

        new Pulumi.Azure.Sql.FirewallRule("firewallRule",
            new Pulumi.Azure.Sql.FirewallRuleArgs
            {
                Name = "AllowAllWindowsAzureIps",
                ServerName = sqlServer.Name,
                ResourceGroupName = resourceGroupName,
                StartIpAddress = "0.0.0.0",
                EndIpAddress = "0.0.0.0",
            });

        var clientConfig = Output.Create(GetClientConfig.InvokeAsync());
        var tenantId = clientConfig.Apply(c => c.TenantId);

        var storageAccountName = Output.Format($"{resourceNamePrefix}funcstorage");
        var storageAccount = new StorageAccount("storageAccountResource", new StorageAccountArgs
        {
            AccountName = storageAccountName,
            Kind = "Storage",
            Location = location,
            ResourceGroupName = resourceGroupName,
            Sku = new Storage.Inputs.SkuArgs
            {
                Name = "Standard_LRS"
            },
        });

        var functionAppName = Output.Format($"{resourceNamePrefix}-func");
        var appInsights = new Component("componentResource", new ComponentArgs
        {
            Location = location,
            RequestSource = "IbizaWebAppExtensionCreate",
            ResourceGroupName = resourceGroupName,
            ResourceName = functionAppName,
            ApplicationType = "web",
            Kind = "web",
            Tags =
            {
                //{ "[concat('hidden-link:', resourceId('Microsoft.Web/sites', parameters('functionAppName')))]", "Resource" },
            },
        });

        var secretName = config.Get("secretNameParam") ?? "sqlPassword";

        var appService = new AppServicePlan("serverfarmResource", new AppServicePlanArgs
        {
            Location = location,
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            Sku = new SkuDescriptionArgs
            {
                Name = "Y1",
                Tier = "Dynamic",
            },
        });

        var storageKey = storageAccount.Name.Apply(a =>
        {
            var task = ListStorageAccountKeys.InvokeAsync(new ListStorageAccountKeysArgs { AccountName = a, ResourceGroupName = resourceGroupName });
            return Output.Create(task).Apply(t => t.Keys[0].Value);
        });

        var functionApp = new WebApp("siteResource", new WebAppArgs
        {
            Kind = "functionapp",
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            ServerFarmId = appService.Id,
            Location = resourceGroup.Apply(r => r.Location),
            Identity = new ManagedServiceIdentityArgs { Type = ManagedServiceIdentityType.SystemAssigned },
            SiteConfig = new SiteConfigArgs
            {
                AppSettings =
                {
                    new NameValuePairArgs
                    {
                        Name = "AzureWebJobsStorage",
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccountName};AccountKey={storageKey}"),
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
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccountName};EndpointSuffix=core.windows.net;AccountKey={storageKey}"),
                    },
                    new NameValuePairArgs
                    {
                        Name = "WEBSITE_CONTENTSHARE",
                        Value = functionAppName.Apply(n => n.ToLower()),
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

        new WebAppSourceControl("sourceControl",
            new WebAppSourceControlArgs
            {
                Name = functionApp.Name,
                IsManualIntegration = true,
                Branch = "main",
                RepoUrl = config.Get("repoURLParam") ?? "https://github.com/Azure-Samples/KeyVault-Rotation-SQLPassword-Csharp.git",
                ResourceGroupName = resourceGroupName,
            });

        var keyVault = new Vault("vaultResource", new VaultArgs
        {
            Location = location,
            Properties = new VaultPropertiesArgs
            {
                AccessPolicies = { new AccessPolicyEntryArgs
                {
                    TenantId = tenantId,
                    ObjectId = functionApp.Identity.Apply(i => i!.PrincipalId),
                    Permissions = new PermissionsArgs
                    {
                        Secrets = { "get", "list", "set" },
                    },
                }
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
            },
            ResourceGroupName = resourceGroupName,
            VaultName = Output.Format($"{resourceNamePrefix}-kv"),
        });

        var topicName = "SecretExpiry";
        var topic = new SystemTopic("eventGridTopic",
            new SystemTopicArgs
            {
                SystemTopicName = topicName,
                Source = keyVault.Id,
                TopicType = "microsoft.keyvault.vaults",
                Location = resourceGroup.Apply(r => r.Location),
                ResourceGroupName = resourceGroup.Apply(r => r.Name),
            });

        var eventSubscription = new SystemTopicEventSubscription("secretExpiryEvent",
            new SystemTopicEventSubscriptionArgs
            {
                EventSubscriptionName = Output.Format($"{keyVault.Name}-{secretName}-{functionAppName}"),
                SystemTopicName = topicName,
                ResourceGroupName = resourceGroup.Apply(r => r.Name),
                //Scope = topic.Id,
                Filter = new EventSubscriptionFilterArgs
                {
                    SubjectBeginsWith = "sqlPassword",
                    SubjectEndsWith = "sqlPassword",
                    IncludedEventTypes = { "Microsoft.KeyVault.SecretNearExpiry" },
                },
                Destination = new AzureFunctionEventSubscriptionDestinationArgs
                {
                    ResourceId = Output.Format($"{functionApp.Id}/functions/AKVSQLRotation"),
                    EndpointType = "AzureFunction",
                    MaxEventsPerBatch = 1,
                    PreferredBatchSizeInKilobytes = 64,
                },
            });

        var expiresAt = DateTimeOffset.Now.AddMinutes(1).ToUnixTimeSeconds();
        var secret = new Secret("secret",
            new SecretArgs
            {
                SecretName = secretName,
                VaultName = keyVault.Name,
                ResourceGroupName = resourceGroupName,
                Tags = { { "CredentialId", sqlAdminLogin }, { "ProviderAddress", sqlServer.Id }, { "ValidityPeriodDays", "1" } },
                Properties = new SecretPropertiesArgs
                {
                    Value = sqlAdminPassword,
                    Attributes = new SecretAttributesArgs { Expires = (int)expiresAt },
                },
            });
    }
}

