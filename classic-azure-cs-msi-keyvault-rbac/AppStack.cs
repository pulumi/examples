// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System.Linq;
using Pulumi;
using Pulumi.Azure.AppService;
using Pulumi.Azure.AppService.Inputs;
using Pulumi.Azure.Authorization;
using Pulumi.Azure.Core;
using Pulumi.Azure.KeyVault;
using Pulumi.Azure.KeyVault.Inputs;
using Pulumi.Azure.MSSql;
using Pulumi.Azure.Storage;
using Pulumi.Random;

class AppStack : Stack
{
    public AppStack()
    {
        var resourceGroup = new ResourceGroup("keyvault-rg");

        // Create a storage account for Blobs
        var storageAccount = new Account("storage", new AccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountReplicationType = "LRS",
            AccountTier = "Standard",
        });

        // The container to put our files into
        var storageContainer = new Container("files", new ContainerArgs
        {
            StorageAccountName = storageAccount.Name,
            ContainerAccessType = "private",
        });

        // Azure SQL Server that we want to access from the application
        var administratorLoginPassword = new RandomPassword("password",
            new RandomPasswordArgs { Length = 16, Special = true }).Result;
        var sqlServer = new Server("sqlserver", new ServerArgs
        {
            ResourceGroupName = resourceGroup.Name,
            // The login and password are required but won't be used in our application
            AdministratorLogin = "manualadmin",
            AdministratorLoginPassword = administratorLoginPassword,
            Version = "12.0",
        });

        // Azure SQL Database that we want to access from the application
        var database = new Database("db", new DatabaseArgs
        {
            ServerId = sqlServer.Id,
            SkuName = "S0",
        });

        // The connection string that has no credentials in it: authertication will come through MSI
        var connectionString =
            Output.Format($"Server=tcp:{sqlServer.Name}.database.windows.net;Database={database.Name};");

        // A file in Blob Storage that we want to access from the application
        var textBlob = new Blob("text", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = storageContainer.Name,
            Type = "Block",
            Source = new FileAsset("./README.md"),
        });

        // A plan to host the App Service
        var appServicePlan = new ServicePlan("asp", new ServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            OsType = "Linux",
            SkuName = "B1",
        });

        // ASP.NET deployment package
        var blob = new Blob("zip", new BlobArgs
        {
            StorageAccountName = storageAccount.Name,
            StorageContainerName = storageContainer.Name,
            Type = "Block",
            Source = new FileArchive("./webapp/bin/Debug/net8.0/publish"),
        });

        var clientConfig = Output.Create(GetClientConfig.InvokeAsync());
        var tenantId = clientConfig.Apply(c => c.TenantId);
        var currentPrincipal = clientConfig.Apply(c => c.ObjectId);

        // Key Vault to store secrets (e.g. Blob URL with SAS)
        var vault = new KeyVault("vault", new KeyVaultArgs
        {
            ResourceGroupName = resourceGroup.Name,
            SkuName = "standard",
            TenantId = tenantId,
            AccessPolicies =
            {
                new KeyVaultAccessPolicyArgs
                {
                    TenantId = tenantId,
                    // The current principal has to be granted permissions to Key Vault so that it can actually add and then remove
                    // secrets to/from the Key Vault. Otherwise, 'pulumi up' and 'pulumi destroy' operations will fail.
                    ObjectId = currentPrincipal,
                    SecretPermissions = {"Delete", "Get", "List", "Set"},
                }
            },
        });

        // Put the URL of the zip Blob to KV
        var secret = new Secret("deployment-zip", new SecretArgs
        {
            KeyVaultId = vault.Id,
            Value = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount),
        });
        var secretUri = Output.Format($"{vault.VaultUri}secrets/{secret.Name}/{secret.Version}");


        // The application hosted in App Service
        var app = new LinuxWebApp("app", new LinuxWebAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ServicePlanId = appServicePlan.Id,
            // A system-assigned managed service identity to be used for authentication and authorization to the SQL Database and the Blob Storage
            Identity = new LinuxWebAppIdentityArgs { Type = "SystemAssigned" },
            SiteConfig = new LinuxWebAppSiteConfigArgs { },
            AppSettings =
            {
                // Website is deployed from a URL read from the Key Vault
                {"WEBSITE_RUN_FROM_ZIP", Output.Format($"@Microsoft.KeyVault(SecretUri={secretUri})")},

                // Note that we simply provide the URL without SAS or keys
                {"StorageBlobUrl", textBlob.Url},
            },
            ConnectionStrings =
            {
                new LinuxWebAppConnectionStringArgs
                {
                    Name = "db",
                    Type = "SQLAzure",
                    Value = connectionString,
                },
            },
        });

        // Work around a preview issue https://github.com/pulumi/pulumi-azure/issues/192
        var principalId = app.Identity.Apply(id => id.PrincipalId ?? "11111111-1111-1111-1111-111111111111");

        // Grant App Service access to KV secrets
        var policy = new AccessPolicy("app-policy", new AccessPolicyArgs
        {
            KeyVaultId = vault.Id,
            TenantId = tenantId,
            ObjectId = principalId,
            SecretPermissions = { "Get" },
        });

        // Grant access from App Service to the container in the storage
        var blobPermission = new Assignment("readblob", new AssignmentArgs
        {
            PrincipalId = principalId,
            Scope = Output.Format($"{storageAccount.Id}/blobServices/default/containers/{storageContainer.Name}"),
            RoleDefinitionName = "Storage Blob Data Reader",
        });

        // Add SQL firewall exceptions
        var firewallRules = app.OutboundIpAddresses.Apply(
            ips => ips.Split(",").Select(
                ip => new FirewallRule($"FR{ip}", new FirewallRuleArgs
                {
                    ServerId = sqlServer.Id,
                    StartIpAddress = ip,
                    EndIpAddress = ip,
                })
            ).ToList());

        this.Endpoint = Output.Format($"https://{app.DefaultHostname}");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
