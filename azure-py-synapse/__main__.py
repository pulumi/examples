# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_azure_native.authorization as authorization
import pulumi_azure_native.storage as storage
import pulumi_azure_native.synapse as synapse
import pulumi_azure_native.resources as resources
import pulumi_random as random

config = pulumi.Config()

resource_group = resources.ResourceGroup("synapse-rg")

storage_account = storage.StorageAccount(
    "synapsesa",
    resource_group_name=resource_group.name,
    access_tier=storage.AccessTier.HOT,
    enable_https_traffic_only=True,
    is_hns_enabled=True,
    kind=storage.Kind.STORAGE_V2,
    sku=storage.SkuArgs(
        name=storage.SkuName.STANDARD_RAGRS,
    ))

data_lake_storage_account_url = storage_account.name.apply(lambda name: f"https://{name}.dfs.core.windows.net")

users = storage.BlobContainer(
    "users",
    resource_group_name=resource_group.name,
    account_name=storage_account.name,
    public_access=storage.PublicAccess.NONE)

workspace = synapse.Workspace(
    "workspace",
    resource_group_name=resource_group.name,
    default_data_lake_storage=synapse.DataLakeStorageAccountDetailsArgs(
        account_url=data_lake_storage_account_url,
        filesystem="users",
    ),
    identity=synapse.ManagedIdentityArgs(
        type=synapse.ResourceIdentityType.SYSTEM_ASSIGNED,
    ),
    sql_administrator_login="sqladminuser",
    sql_administrator_login_password=random.RandomPassword("workspacePwd", length=12).result)

allow_all = synapse.IpFirewallRule(
    "allowAll",
    resource_group_name=resource_group.name,
    workspace_name=workspace.name,
    end_ip_address="255.255.255.255",
    start_ip_address="0.0.0.0")

subscription_id = resource_group.id.apply(lambda id: id.split('/')[2])
role_definition_id = subscription_id.apply(
    lambda
        id: f"/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe")

storage_access = authorization.RoleAssignment(
    "storageAccess",
    role_assignment_name=random.RandomUuid("roleName").result,
    scope=storage_account.id,
    principal_id=workspace.identity.principal_id.apply(lambda v: v or "<preview>"),
    principal_type="ServicePrincipal",
    role_definition_id=role_definition_id)

user_access = authorization.RoleAssignment(
    "userAccess",
    role_assignment_name=random.RandomUuid("userRoleName").result,
    scope=storage_account.id,
    principal_id=config.require("userObjectId"),
    principal_type="User",
    role_definition_id=role_definition_id)

sql_pool = synapse.SqlPool(
    "SQLPOOL1",
    resource_group_name=resource_group.name,
    workspace_name=workspace.name,
    collation="SQL_Latin1_General_CP1_CI_AS",
    create_mode="Default",
    sku=synapse.SkuArgs(
        name="DW100c",
    ))

spark_pool = synapse.BigDataPool(
    "Spark1",
    resource_group_name=resource_group.name,
    workspace_name=workspace.name,
    auto_pause=synapse.AutoPausePropertiesArgs(
        delay_in_minutes=15,
        enabled=True,
    ),
    auto_scale=synapse.AutoScalePropertiesArgs(
        enabled=True,
        max_node_count=3,
        min_node_count=3,
    ),
    node_count=3,
    node_size="Small",
    node_size_family="MemoryOptimized",
    spark_version="2.4")
