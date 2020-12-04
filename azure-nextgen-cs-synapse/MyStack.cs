// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNextGen.Authorization.V20200401Preview;
using Pulumi.AzureNextGen.Resources.Latest;
using Pulumi.AzureNextGen.Storage.Latest;
using Pulumi.AzureNextGen.Synapse.V20190601Preview;
using Pulumi.AzureNextGen.Synapse.V20190601Preview.Inputs;
using Pulumi.Random;
using SkuArgs = Pulumi.AzureNextGen.Storage.Latest.Inputs.SkuArgs;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Pulumi.Config();
        var location = config.Get("location") ?? "WestUS";

        var resourceGroup = new ResourceGroup("resourceGroup", new ResourceGroupArgs
        {
            ResourceGroupName = "synapse-rg",
            Location = location
        });

        var storageAccount = new StorageAccount("storageAccount", new StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            AccountName = "synapsesa",
            AccessTier = "Hot",
            EnableHttpsTrafficOnly = true,
            IsHnsEnabled = true,
            Kind = "StorageV2",
            Sku = new SkuArgs
            {
                Name = "Standard_RAGRS"
            },
        });
        var dataLakeStorageAccountUrl = Output.Format($"https://{storageAccount.Name}.dfs.core.windows.net");
        
        var users = new BlobContainer("users", new BlobContainerArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccountName = storageAccount.Name,
            ContainerName = "users",
            PublicAccess = "None"
        });
        
        var workspace = new Workspace("workspace", new WorkspaceArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            WorkspaceName = "my-workspace",
            DefaultDataLakeStorage = new DataLakeStorageAccountDetailsArgs
            {
                AccountUrl = dataLakeStorageAccountUrl,
                Filesystem = "users"
            },
            Identity = new ManagedIdentityArgs
            {
                Type = "SystemAssigned"
            },
            SqlAdministratorLogin = "sqladminuser",
            SqlAdministratorLoginPassword = "YourStrongPassword"
        });

        var allowAll = new IpFirewallRule("allowAll", new IpFirewallRuleArgs
        {
            ResourceGroupName = resourceGroup.Name,
            WorkspaceName = workspace.Name,
            RuleName = "allowAll",
            EndIpAddress = "255.255.255.255",
            StartIpAddress = "0.0.0.0"
        });

        var subscriptionId = resourceGroup.Id.Apply(id => id.Split('/')[2]);
        var roleDefinitionId = $"/subscriptions/{subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe";

        var storageAccess = new RoleAssignment("storageAccess", new RoleAssignmentArgs
        {
            RoleAssignmentName = new RandomUuid("roleName").Result,
            Scope = storageAccount.Id,
            PrincipalId = workspace.Identity.Apply(identity => identity.PrincipalId).Apply(v => v ?? "<preview>"),
            PrincipalType = "ServicePrincipal",
            RoleDefinitionId = roleDefinitionId
        });
        var userAccess = new RoleAssignment("userAccess", new RoleAssignmentArgs
        {
            RoleAssignmentName = new RandomUuid("userRoleName").Result,
            Scope = storageAccount.Id,
            PrincipalId = config.Require("userObjectId"),
            PrincipalType = "User",
            RoleDefinitionId = roleDefinitionId
        });

        var sqlPool = new SqlPool("sqlPool", new SqlPoolArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            WorkspaceName = workspace.Name,
            SqlPoolName = "SQLPOOL1",
            Collation = "SQL_Latin1_General_CP1_CI_AS",
            CreateMode = "Default",
            Sku = new Pulumi.AzureNextGen.Synapse.V20190601Preview.Inputs.SkuArgs
            {
                Name = "DW100c"
            },
        });

        var sparkPool = new BigDataPool("sparkPool", new BigDataPoolArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Location = resourceGroup.Location,
            WorkspaceName = workspace.Name,
            BigDataPoolName = "Spark1",
            AutoPause = new AutoPausePropertiesArgs
            {
                DelayInMinutes = 15,
                Enabled = true,
            },
            AutoScale = new AutoScalePropertiesArgs
            {
                Enabled = true,
                MaxNodeCount = 3,
                MinNodeCount = 3,
            },
            NodeCount = 3,
            NodeSize = "Small",
            NodeSizeFamily = "MemoryOptimized",
            SparkVersion = "2.4"
        });
    }
}
