// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNextGen.Authorization.Latest;
using Pulumi.AzureNextGen.EventGrid.Latest;
using Pulumi.AzureNextGen.Storage.Latest;
using System;
using System.Threading.Tasks;
using AzureNextGen = Pulumi.AzureNextGen;

class AppStack : Stack
{
    //[Output]
    //public WebEndpoint

    public AppStack()
    {
        var config = new Config();
        var resourceGroupName = config.Require("resourceGroupNameParam");
        var resourceGroupVar = Output.Create(AzureNextGen.Resources.Latest.GetResourceGroup.InvokeAsync(new AzureNextGen.Resources.Latest.GetResourceGroupArgs
        {
            ResourceGroupName = resourceGroupName,
        }));

        var resourceNamePrefix = Output.Create(config.Get("resourceNamePrefixParam")) ?? resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Name)!;
        var sqlAdminLogin = config.Get("sqlAdminLoginParam") ?? "sqlAdmin";
        var serverResource = new AzureNextGen.Sql.V20190601Preview.Server("serverResource", new AzureNextGen.Sql.V20190601Preview.ServerArgs
        {
            AdministratorLogin = sqlAdminLogin,
            AdministratorLoginPassword = "Simple123",
            Location = resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Location),
            ResourceGroupName = resourceGroupName,
            ServerName = Output.Format($"{resourceNamePrefix}-sql"),
            Version = "12.0",
        });

        //var firewall = new AzureNextGen.Sql.Latest.FirewallRule("firewall", new AzureNextGen.Sql.Latest.FirewallRuleArgs { 
        //    FirewallRuleName  = ""

        var clientConfig = Output.Create(GetClientConfig.InvokeAsync());
        var tenantId = clientConfig.Apply(c => c.TenantId);

        var storageAccountName = Output.Format($"{resourceNamePrefix}funcstorage");
        var storageAccountResource = new AzureNextGen.Storage.V20190401.StorageAccount("storageAccountResource", new AzureNextGen.Storage.V20190401.StorageAccountArgs
        {
            AccountName = storageAccountName,
            Kind = "Storage",
            Location = resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Location),
            ResourceGroupName = resourceGroupName,
            Sku = new AzureNextGen.Storage.V20190401.Inputs.SkuArgs
            {
                Name = "Standard_LRS"
            },
        });

        var functionAppName = Output.Format($"{resourceNamePrefix}-func");
        var componentResource = new AzureNextGen.Insights.V20180501Preview.Component("componentResource", new AzureNextGen.Insights.V20180501Preview.ComponentArgs
        {
            Location = resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Location),
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

        var secretNameParam = config.Get("secretNameParam") ?? "sqlPassword";

        var repoURLParam = config.Get("repoURLParam") ?? "https://github.com/jlichwa/KeyVault-Rotation-SQLPassword-Csharp.git";
        var serverfarmResource = new AzureNextGen.Web.V20180201.AppServicePlan("serverfarmResource", new AzureNextGen.Web.V20180201.AppServicePlanArgs
        {
            Location = resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Location),
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            Sku = new AzureNextGen.Web.V20180201.Inputs.SkuDescriptionArgs
            {
                Name = "Y1",
                Tier = "Dynamic",
            },
        });

        var storageKey = storageAccountResource.Name.Apply(a =>
        {
            var task = ListStorageAccountKeys.InvokeAsync(new ListStorageAccountKeysArgs { AccountName = a, ResourceGroupName = resourceGroupName });
            return Output.Create(task).Apply(t => t.Keys[0].Value);
        });

        var functionApp = new AzureNextGen.Web.V20181101.WebApp("siteResource", new AzureNextGen.Web.V20181101.WebAppArgs
        {
            Kind = "functionapp",
            Name = functionAppName,
            ResourceGroupName = resourceGroupName,
            ServerFarmId = serverfarmResource.Id,
            Location = resourceGroupVar.Apply(r => r.Location),
            Identity = new AzureNextGen.Web.V20181101.Inputs.ManagedServiceIdentityArgs {  Type = AzureNextGen.Web.V20181101.ManagedServiceIdentityType.SystemAssigned },
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
                        Value = componentResource.InstrumentationKey,
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
                Branch = "master",
                RepoUrl = repoURLParam,
                ResourceGroupName = resourceGroupName,
            });

        var keyVault = new AzureNextGen.KeyVault.V20180214.Vault("vaultResource", new AzureNextGen.KeyVault.V20180214.VaultArgs
        {
            Location = resourceGroupVar.Apply(resourceGroupVar => resourceGroupVar.Location),
            Properties = new AzureNextGen.KeyVault.V20180214.Inputs.VaultPropertiesArgs
            {
                AccessPolicies = { new AzureNextGen.KeyVault.V20180214.Inputs.AccessPolicyEntryArgs
                {
                    TenantId = tenantId,
                    ObjectId = functionApp.Identity.Apply(i => i.PrincipalId),
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

        var eventSubscriptionNameVar = $"{keyVault.Name}-{secretNameParam}-{functionAppName}";

        var topicName = "SecretExpiry";
        var topic = new AzureNextGen.EventGrid.V20200401Preview.SystemTopic("eventGridTopic",
            new AzureNextGen.EventGrid.V20200401Preview.SystemTopicArgs
            {
                SystemTopicName = topicName,
                Source = keyVault.Id,
                TopicType = "microsoft.keyvault.vaults",
                Location = resourceGroupVar.Apply(r => r.Location),
                ResourceGroupName = resourceGroupVar.Apply(r => r.Name),
            });

        var eventSubscriptionResource = new AzureNextGen.EventGrid.V20200401Preview.SystemTopicEventSubscription("secretExpiryEvent",
            new AzureNextGen.EventGrid.V20200401Preview.SystemTopicEventSubscriptionArgs
            {
                EventSubscriptionName = "secretExpiryEvent",
                SystemTopicName = topicName,
                ResourceGroupName = resourceGroupVar.Apply(r => r.Name),
                //Scope = topic.Id,
                Filter = new AzureNextGen.EventGrid.V20200401Preview.Inputs.EventSubscriptionFilterArgs
                {
                    SubjectBeginsWith = "sqlPassword",
                    SubjectEndsWith = "sqlPassword",
                    IncludedEventTypes = { "Microsoft.KeyVault.SecretNearExpiry" },
                },
                Destination = new AzureNextGen.EventGrid.Latest.Inputs.AzureFunctionEventSubscriptionDestinationArgs
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

        new AzureNextGen.KeyVault.Latest.Secret("secret",
            new AzureNextGen.KeyVault.Latest.SecretArgs
            {
                SecretName = secretNameParam,
                VaultName = keyVault.Name,
                ResourceGroupName = resourceGroupName,
                Properties = new AzureNextGen.KeyVault.Latest.Inputs.SecretPropertiesArgs { Value = Guid.NewGuid().ToString() },
            });
    }
}

