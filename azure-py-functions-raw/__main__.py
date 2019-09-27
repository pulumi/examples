from pulumi import asset, export, Output
from pulumi_azure import core, storage, appservice

resource_group = core.ResourceGroup("windowsrg")

httpdotnet_storage_account = storage.Account(
    "httpdotnet",
    account_kind="StorageV2",
    account_tier="Standard",
    account_replication_type="LRS",
    resource_group_name=resource_group.name,
)

httpdotnet_container=storage.Container(
    "http-dotnet",
    storage_account_name=httpdotnet_storage_account.name,
    container_access_type="private"
)

httpdotnet_zib_blob=storage.ZipBlob(
    "http-dotnet",
    resource_group_name=resource_group.name,
    storage_account_name=httpdotnet_storage_account.name,
    storage_container_name=httpdotnet_container.name,
    type="block",
    content=asset.AssetArchive({
        ".": asset.FileArchive("./dotnet/bin/Debug/netcoreapp2.1/publish")
    }))

account_sas=storage.get_account_sas(
    connection_string=httpdotnet_storage_account.primary_connection_string,
    start="2019-01-01",
    expiry="2029-01-01",
    services={
        "blob": "true",
        "queue": "false",
        "table": "false",
        "file": "false"
    },
    resource_types={
        "service": "false",
        "container": "false",
        "object": "true"
    },
    permissions={
        "read": "true",
        "write": "false",
        "delete": "false",
        "add": "false",
        "list": "false",
        "create": "false",
        "update": "false",
        "process": "false"
    },
)
httpdotnet_signed_blob_url = Output.all(httpdotnet_storage_account.name, httpdotnet_container.name, httpdotnet_zib_blob.name, account_sas.sas) \
    .apply(lambda args: f"https://{args[0]}.blob.core.windows.net/{args[1]}/{args[2]}{args[3]}")

httpdotnet_plan=appservice.Plan(
    "http-dotnet",
    resource_group_name=resource_group.name,
    kind="FunctionApp",
    sku={
        "tier": "Dynamic",
        "size": "Y1"
    }
)

httpdotnet_function_app=appservice.FunctionApp(
    "http-dotnet",
    resource_group_name=resource_group.name,
    app_service_plan_id=httpdotnet_plan.id,
    storage_connection_string=httpdotnet_storage_account.primary_connection_string,
    version="~2",
    app_settings={
        "runtime": "dotnet",
        "WEBSITE_NODE_DEFAULT_VERSION": "8.11.1",
        "WEBSITE_RUN_FROM_PACKAGE": httpdotnet_signed_blob_url,
    },
)

export("dotnet_endpoint", httpdotnet_function_app.default_hostname.apply(
    lambda endpoint: "https://" + endpoint + "/api/HelloDotnet?name=Pulumi"))
