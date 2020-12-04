// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import * as authorization from "@pulumi/azure-nextgen/authorization/v20200401preview";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as storage from "@pulumi/azure-nextgen/storage/latest";
import * as synapse from "@pulumi/azure-nextgen/synapse/v20190601preview";

const config = new pulumi.Config();
const location = config.get("location") || "WestUS2";

const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: "synapse-rg",
    location: location,
});

const storageAccount = new storage.StorageAccount("storageAccount", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountName: "synapsesa",
    accessTier: "Hot",
    enableHttpsTrafficOnly: true,
    isHnsEnabled: true,
    kind: "StorageV2",
    sku: {
        name: "Standard_RAGRS",
    },
});

const users = new storage.BlobContainer("users", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: "users",
    publicAccess: "None",
});

const dataLakeStorageAccountUrl = pulumi.interpolate`https://${storageAccount.name}.dfs.core.windows.net`;

const workspace = new synapse.Workspace("workspace", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    workspaceName: "my-workspace",
    defaultDataLakeStorage: {
        accountUrl: dataLakeStorageAccountUrl,
        filesystem: "users",
    },
    identity: {
        type: "SystemAssigned",
    },
    sqlAdministratorLogin: "sqladminuser",
    sqlAdministratorLoginPassword: new random.RandomPassword("workspacePwd", {length: 12 }).result,
});

const firewallRule = new synapse.IpFirewallRule("allowAll", {
    resourceGroupName: resourceGroup.name,
    workspaceName: workspace.name,
    ruleName: "allowAll",
    endIpAddress: "255.255.255.255",
    startIpAddress: "0.0.0.0",
});

const subscriptionId = resourceGroup.id.apply(id => id.split("/")[2]);
const roleDefinitionId = pulumi.interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe`;

const storageAccess = new authorization.RoleAssignment("storageAccess", {
    roleAssignmentName: new random.RandomUuid("roleName").result,
    scope: storageAccount.id,
    principalId: workspace.identity.apply(i => i?.principalId).apply(id => id || "<preview>"),
    principalType: "ServicePrincipal",
    roleDefinitionId: roleDefinitionId,
});

const userAccess = new authorization.RoleAssignment("userAccess", {
  roleAssignmentName: new random.RandomUuid("userRoleName").result,
  scope: storageAccount.id,
  principalId: config.Get("userObjectId"),
  principalType: "User",
  roleDefinitionId: roleDefinitionId,
});

const sqlPool = new synapse.SqlPool("sqlPool", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    workspaceName: workspace.name,
    sqlPoolName: "SQLPOOL1",
    collation: "SQL_Latin1_General_CP1_CI_AS",
    createMode: "Default",
    sku: {
        name: "DW100c",
    },
});

const sparkPool = new synapse.BigDataPool("sparkPool", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    workspaceName: workspace.name,
    bigDataPoolName: "Spark1",
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
    nodeSize: "Small",
    nodeSizeFamily: "MemoryOptimized",
    sparkVersion: "2.4",
});
