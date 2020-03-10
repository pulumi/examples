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

httpdotnet_zib_blob=storage.Blob(
    "http-dotnet",
    storage_account_name=httpdotnet_storage_account.name,
    storage_container_name=httpdotnet_container.name,
    type="Block",
    source=asset.AssetArchive({
        ".": asset.FileArchive("./dotnet/bin/Debug/netcoreapp3.1/publish")
    }))

def get_sas(args):
    blob_sas = storage.get_account_blob_container_sas(
        connection_string=args[1],
        start="2020-01-01",
        expiry="2030-01-01",
        container_name=args[2],
        permissions={
            "read": "true",
            "write": "false",
            "delete": "false",
            "list": "false",
            "add": "false",
            "create": "false"
        }
    )
    return f"https://{args[0]}.blob.core.windows.net/{args[2]}/{args[3]}{blob_sas.sas}"

httpdotnet_signed_blob_url = Output.all(
    httpdotnet_storage_account.name,
    httpdotnet_storage_account.primary_connection_string,
    httpdotnet_container.name, httpdotnet_zib_blob.name
).apply(get_sas)

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
    version="~3",
    app_settings={
        "runtime": "dotnet",
        "WEBSITE_RUN_FROM_PACKAGE": httpdotnet_signed_blob_url,
    },
)

export("dotnet_endpoint", httpdotnet_function_app.default_hostname.apply(
    lambda endpoint: "https://" + endpoint + "/api/HelloDotnet?name=Pulumi"))
