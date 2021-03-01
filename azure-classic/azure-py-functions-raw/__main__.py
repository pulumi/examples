from pulumi import asset, export, Output
from pulumi_azure import core, storage, appservice

resource_group = core.ResourceGroup("linuxrg")

http_storage_account = storage.Account(
    "http",
    account_kind="StorageV2",
    account_tier="Standard",
    account_replication_type="LRS",
    resource_group_name=resource_group.name,
)

http_container=storage.Container(
    "http",
    storage_account_name=http_storage_account.name,
    container_access_type="private"
)

http_zib_blob=storage.Blob(
    "http",
    storage_account_name=http_storage_account.name,
    storage_container_name=http_container.name,
    type="Block",
    source=asset.AssetArchive({
        ".": asset.FileArchive("./python")
    }))

def get_sas(args):
    blob_sas = storage.get_account_blob_container_sas(
        connection_string=args[1],
        start="2020-01-01",
        expiry="2030-01-01",
        container_name=args[2],
        permissions=storage.GetAccountBlobContainerSASPermissionsArgs(
            read=True,
            write=False,
            delete=False,
            list=False,
            add=False,
            create=False,
        )
    )
    return f"https://{args[0]}.blob.core.windows.net/{args[2]}/{args[3]}{blob_sas.sas}"

http_signed_blob_url = Output.all(
    http_storage_account.name,
    http_storage_account.primary_connection_string,
    http_container.name, http_zib_blob.name
).apply(get_sas)

http_plan=appservice.Plan(
    "http",
    resource_group_name=resource_group.name,
    kind="Linux",
    sku=appservice.PlanSkuArgs(
        tier="Dynamic",
        size="Y1"
    ),
    reserved=True,
)

http_function_app=appservice.FunctionApp(
    "http",
    resource_group_name=resource_group.name,
    app_service_plan_id=http_plan.id,
    storage_account_name=http_storage_account.name,
    storage_account_access_key=http_storage_account.primary_access_key,
    version="~3",
    app_settings={
        "FUNCTIONS_WORKER_RUNTIME": "python",
        "WEBSITE_RUN_FROM_PACKAGE": http_signed_blob_url,
    },
)

export("endpoint", http_function_app.default_hostname.apply(
    lambda endpoint: "https://" + endpoint + "/api/HelloPython?name=Pulumi"))
