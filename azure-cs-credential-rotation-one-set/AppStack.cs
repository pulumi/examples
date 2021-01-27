// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNextGen.Authorization.Latest;
using Pulumi.AzureNextGen.EventGrid.Latest;
using Pulumi.AzureNextGen.Storage.Latest;
using System;
using AzureNextGen = Pulumi.AzureNextGen;
using Pulumi.AzureNextGen.KeyVault.Latest;
using Pulumi.AzureNextGen.Resources.Latest;
using Pulumi.AzureNextGen.EventGrid.Latest.Inputs;
using Pulumi.AzureNextGen.KeyVault.Latest.Inputs;

class AppStack : Stack
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
        var sqlServer = new AzureNextGen.Sql.V20190601Preview.Server("serverResource", new AzureNextGen.Sql.V20190601Preview.ServerArgs
        {
            AdministratorLogin = sqlAdminLogin,
            AdministratorLoginPassword = sqlAdminPassword,
            Location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location),
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
        var storageAccount = new AzureNextGen.Storage.V20190401.StorageAccount("storageAccountResource", new AzureNextGen.Storage.V20190401.StorageAccountArgs
        {
            AccountName = storageAccountName,
            Kind = "Storage",
            Location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location),
            ResourceGroupName = resourceGroupName,
            Sku = new AzureNextGen.Storage.V20190401.Inputs.SkuArgs
            {
                Name = "Standard_LRS"
            },
        });

        var functionAppName = Output.Format($"{resourceNamePrefix}-func");
        var appInsights = new AzureNextGen.Insights.V20180501Preview.Component("componentResource", new AzureNextGen.Insights.V20180501Preview.ComponentArgs
        {
            Location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location),
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

        var repoUrl = config.Get("repoURLParam") ?? "https://github.com/MisinformedDNA/KeyVault-Rotation-SQLPassword-Csharp.git";
        var appService = new AzureNextGen.Web.V20180201.AppServicePlan("serverfarmResource", new AzureNextGen.Web.V20180201.AppServicePlanArgs
        {
            Location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location),
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            Sku = new AzureNextGen.Web.V20180201.Inputs.SkuDescriptionArgs
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

        var functionApp = new AzureNextGen.Web.V20181101.WebApp("siteResource", new AzureNextGen.Web.V20181101.WebAppArgs
        {
            Kind = "functionapp",
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            ServerFarmId = appService.Id,
            Location = resourceGroup.Apply(r => r.Location),
            Identity = new AzureNextGen.Web.V20181101.Inputs.ManagedServiceIdentityArgs { Type = AzureNextGen.Web.V20181101.ManagedServiceIdentityType.SystemAssigned },
            SiteConfig = new AzureNextGen.Web.V20181101.Inputs.SiteConfigArgs
            {
                AppSettings =
                {
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "AzureWebJobsStorage",
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccountName};AccountKey={storageKey}"),
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "FUNCTIONS_EXTENSION_VERSION",
                        Value = "~3",
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "FUNCTIONS_WORKER_RUNTIME",
                        Value = "dotnet",
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                        Value = Output.Format($"DefaultEndpointsProtocol=https;AccountName={storageAccountName};EndpointSuffix=core.windows.net;AccountKey={storageKey}"),
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "WEBSITE_CONTENTSHARE",
                        Value = functionAppName.Apply(n => n.ToLower()),
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "WEBSITE_NODE_DEFAULT_VERSION",
                        Value = "~10",
                    },
                    new AzureNextGen.Web.V20181101.Inputs.NameValuePairArgs
                    {
                        Name = "APPINSIGHTS_INSTRUMENTATIONKEY",
                        Value = appInsights.InstrumentationKey,
                    },
                },
            },
        });

        //new Pulumi.Azure.AppService.FunctionApp("", new Pulumi.Azure.AppService.FunctionAppArgs
        //{
        //    SourceControl = new Pulumi.Azure.AppService.Inputs.FunctionAppSourceControlArgs
        //    {
        //        ManualIntegration = true,
        //        Branch = "master",
        //        RepoUrl = repoURLParam,
        //    }
        //});

        new AzureNextGen.Web.V20181101.WebAppSourceControl("sourceControl",
            new AzureNextGen.Web.V20181101.WebAppSourceControlArgs
            {
                Name = functionApp.Name,
                IsManualIntegration = true,
                Branch = "logging",
                RepoUrl = repoUrl,
                ResourceGroupName = resourceGroupName,
            });

        var keyVault = new AzureNextGen.KeyVault.V20180214.Vault("vaultResource", new AzureNextGen.KeyVault.V20180214.VaultArgs
        {
            Location = resourceGroup.Apply(resourceGroupVar => resourceGroupVar.Location),
            Properties = new AzureNextGen.KeyVault.V20180214.Inputs.VaultPropertiesArgs
            {
                AccessPolicies = { new AzureNextGen.KeyVault.V20180214.Inputs.AccessPolicyEntryArgs
                {
                    TenantId = tenantId,
                    ObjectId = functionApp.Identity.Apply(i => i!.PrincipalId),
                    Permissions = new AzureNextGen.KeyVault.V20180214.Inputs.PermissionsArgs
                    {
                        Secrets = { "get", "list", "set" },
                    },
                }
                },
                EnabledForDeployment = false,
                EnabledForDiskEncryption = false,
                EnabledForTemplateDeployment = false,
                Sku = new AzureNextGen.KeyVault.V20180214.Inputs.SkuArgs
                {
                    Family = "A",
                    Name = AzureNextGen.KeyVault.V20180214.SkuName.Standard,
                },
                TenantId = tenantId,
            },
            ResourceGroupName = resourceGroupName,
            VaultName = Output.Format($"{resourceNamePrefix}-kv"),
        });

        var eventSubscriptionNameVar = $"{keyVault.Name}-{secretName}-{functionAppName}";

        var topicName = "SecretExpiry";
        var topic = new AzureNextGen.EventGrid.V20200401Preview.SystemTopic("eventGridTopic",
            new AzureNextGen.EventGrid.V20200401Preview.SystemTopicArgs
            {
                SystemTopicName = topicName,
                Source = keyVault.Id,
                TopicType = "microsoft.keyvault.vaults",
                Location = resourceGroup.Apply(r => r.Location),
                ResourceGroupName = resourceGroup.Apply(r => r.Name),
            });

        var eventSubscription = new AzureNextGen.EventGrid.V20200401Preview.SystemTopicEventSubscription("secretExpiryEvent",
            new AzureNextGen.EventGrid.V20200401Preview.SystemTopicEventSubscriptionArgs
            {
                EventSubscriptionName = "secretExpiryEvent",
                SystemTopicName = topicName,
                ResourceGroupName = resourceGroup.Apply(r => r.Name),
                //Scope = topic.Id,
                Filter = new AzureNextGen.EventGrid.V20200401Preview.Inputs.EventSubscriptionFilterArgs
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

        //var accessPolicyResource = new Pulumi.Azure.KeyVault.AccessPolicy("webAppPolicy",
        //    new Pulumi.Azure.KeyVault.AccessPolicyArgs
        //    {
        //        KeyVaultId = vaultResource.Id,
        //        TenantId = tenantId,
        //        ObjectId = functionApp.Identity.Apply(i => i.PrincipalId),
        //        SecretPermissions = { "get", "list", "set" }
        //    });
        //var accessPolicyResourc2 = new AzureNextGen.KeyVault.Latest.Inputs.AccessPolicyEntryArgs
        //{
        //    TenantId = tenantId,
        //    ObjectId = functionApp.Identity.Apply(i => i.PrincipalId),
        //    Permissions = new AzureNextGen.KeyVault.Latest.Inputs.PermissionsArgs
        //    {
        //        Secrets = { "get", "list", "set" },
        //    },
        //};

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

