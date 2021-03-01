// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNative.Authorization;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Storage;
using Pulumi.AzureNative.Synapse;
using Pulumi.AzureNative.Synapse.Inputs;
using Pulumi.Random;
using ResourceIdentityType = Pulumi.AzureNative.Synapse.ResourceIdentityType;
using SkuArgs = Pulumi.AzureNative.Storage.Inputs.SkuArgs;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Pulumi.Config();
        var location = config.Get("location") ?? "WestUS";

        var resourceGroup = new ResourceGroup("synapse-rg");

        var storageAccount = new StorageAccount("synapsesa", new StorageAccountArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AccessTier = AccessTier.Hot,
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
            PublicAccess = PublicAccess.None
        });

        var workspacePwd = new RandomPassword("workspace-pwd", new RandomPasswordArgs
        {
            Length = 12,
        });
        
        var workspace = new Workspace("workspace", new WorkspaceArgs
        {
            ResourceGroupName = resourceGroup.Name,
            DefaultDataLakeStorage = new DataLakeStorageAccountDetailsArgs
            {
                AccountUrl = dataLakeStorageAccountUrl,
                Filesystem = "users"
            },
            Identity = new ManagedIdentityArgs
            {
                Type = ResourceIdentityType.SystemAssigned
            },
            SqlAdministratorLogin = "sqladminuser",
            SqlAdministratorLoginPassword = workspacePwd.Result
        });

        var allowAll = new IpFirewallRule("allowAll", new IpFirewallRuleArgs
        {
            ResourceGroupName = resourceGroup.Name,
            WorkspaceName = workspace.Name,
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
        var clientConfig = Output.Create(GetClientConfig.InvokeAsync());
        var userAccess = new RoleAssignment("userAccess", new RoleAssignmentArgs
        {
            RoleAssignmentName = new RandomUuid("userRoleName").Result,
            Scope = storageAccount.Id,
            PrincipalId = clientConfig.Apply(v => v.ObjectId),
            PrincipalType = "User",
            RoleDefinitionId = roleDefinitionId
        });

        var sqlPool = new SqlPool("SQLPOOL1", new SqlPoolArgs
        {
            ResourceGroupName = resourceGroup.Name,
            WorkspaceName = workspace.Name,
            Collation = "SQL_Latin1_General_CP1_CI_AS",
            CreateMode = "Default",
            Sku = new Pulumi.AzureNative.Synapse.Inputs.SkuArgs
            {
                Name = "DW100c"
            },
        });

        var sparkPool = new BigDataPool("Spark1", new BigDataPoolArgs
        {
            ResourceGroupName = resourceGroup.Name,
            WorkspaceName = workspace.Name,
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
