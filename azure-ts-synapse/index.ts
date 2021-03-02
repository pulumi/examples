// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import * as authorization from "@pulumi/azure-native/authorization";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as synapse from "@pulumi/azure-native/synapse";

const resourceGroup = new resources.ResourceGroup("synapse-rg");

const storageAccount = new storage.StorageAccount("synapsesa", {
    resourceGroupName: resourceGroup.name,
    accessTier: storage.AccessTier.Hot,
    enableHttpsTrafficOnly: true,
    isHnsEnabled: true,
    kind: storage.Kind.StorageV2,
    sku: {
        name: storage.SkuName.Standard_RAGRS,
    },
});

const users = new storage.BlobContainer("users", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    publicAccess: "None",
});

const dataLakeStorageAccountUrl = pulumi.interpolate`https://${storageAccount.name}.dfs.core.windows.net`;

const workspace = new synapse.Workspace("my-workspace", {
    resourceGroupName: resourceGroup.name,
    defaultDataLakeStorage: {
        accountUrl: dataLakeStorageAccountUrl,
        filesystem: "users",
    },
    identity: {
        type: synapse.ResourceIdentityType.SystemAssigned,
    },
    sqlAdministratorLogin: "sqladminuser",
    sqlAdministratorLoginPassword: new random.RandomPassword("workspacePwd", {length: 12 }).result,
});

const firewallRule = new synapse.IpFirewallRule("allowAll", {
    resourceGroupName: resourceGroup.name,
    workspaceName: workspace.name,
    endIpAddress: "255.255.255.255",
    startIpAddress: "0.0.0.0",
});

const subscriptionId = resourceGroup.id.apply(id => id.split("/")[2]);
const roleDefinitionId = pulumi.interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe`;

const storageAccess = new authorization.RoleAssignment("storageAccess", {
    roleAssignmentName: new random.RandomUuid("roleName").result,
    scope: storageAccount.id,
    principalId: workspace.identity.apply(i => i?.principalId).apply(id => id || "<preview>"),
    principalType: authorization.PrincipalType.ServicePrincipal,
    roleDefinitionId: roleDefinitionId,
});

const clientConfig = pulumi.output(authorization.getClientConfig());

const userAccess = new authorization.RoleAssignment("userAccess", {
  roleAssignmentName: new random.RandomUuid("userRoleName").result,
  scope: storageAccount.id,
  principalId: clientConfig.objectId,
  principalType: authorization.PrincipalType.User,
  roleDefinitionId: roleDefinitionId,
});

const sqlPool = new synapse.SqlPool("SQLPOOL1", {
    resourceGroupName: resourceGroup.name,
    workspaceName: workspace.name,
    collation: "SQL_Latin1_General_CP1_CI_AS",
    createMode: "Default",
    sku: {
        name: "DW100c",
    },
});

const sparkPool = new synapse.BigDataPool("Spark1", {
    resourceGroupName: resourceGroup.name,
    workspaceName: workspace.name,
    autoPause: {
        delayInMinutes: 15,
        enabled: true,
    },
    autoScale: {
        enabled: true,
        maxNodeCount: 3,
        minNodeCount: 3,
    },
    nodeCount: 3,
    nodeSize: synapse.NodeSize.Small,
    nodeSizeFamily: synapse.NodeSizeFamily.MemoryOptimized,
    sparkVersion: "2.4",
});
