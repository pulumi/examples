import pulumi_azure_native.insights as insights
import pulumi_azure_native.resources as resource
import pulumi_azure_native.sql as sql
import pulumi_azure_native.storage as storage
import pulumi_azure_native.web as web
from pulumi import Config, Output, asset, export
from pulumi_azure_native.storage import (BlobContainer, PublicAccess,
                                         StorageAccount)

username = "pulumi"

config = Config()
pwd = config.require("sqlPassword")

resource_group = resource.ResourceGroup("appservicerg")

storage_account = storage.StorageAccount(
    "appservicesa",
    resource_group_name=resource_group.name,
    kind=storage.Kind.STORAGE_V2,
    sku=storage.SkuArgs(name=storage.SkuName.STANDARD_LRS))

app_service_plan = web.AppServicePlan(
    "appservice-asp",
    resource_group_name=resource_group.name,
    kind="App",
    sku=web.SkuDescriptionArgs(
        tier="Basic",
        name="B1",
    ))

storage_container = BlobContainer(
    "appservice-c",
    account_name=storage_account.name,
    public_access=PublicAccess.NONE,
    resource_group_name=resource_group.name)

blob = storage.Blob(
    "appservice-b",
    resource_group_name=resource_group.name,
    account_name=storage_account.name,
    container_name=storage_container.name,
    type=storage.BlobType.BLOCK,
    source=asset.FileArchive("wwwroot"))

blob_sas = storage.list_storage_account_service_sas_output(
    account_name=storage_account.name,
    protocols=storage.HttpProtocol.HTTPS,
    shared_access_start_time="2021-01-01",
    shared_access_expiry_time="2030-01-01",
    resource=storage.SignedResource.C,
    resource_group_name=resource_group.name,
    permissions=storage.Permissions.R,
    canonicalized_resource=Output.concat("/blob/", storage_account.name, "/", storage_container.name),
    content_type="application/json",
    cache_control="max-age=5",
    content_disposition="inline",
    content_encoding="deflate")

signed_blob_url = Output.concat(
    "https://", storage_account.name, ".blob.core.windows.net/",
    storage_container.name, "/",
    blob.name, "?",
    blob_sas.service_sas_token)

app_insights = insights.Component(
    "appservice-ai",
    application_type=insights.ApplicationType.WEB,
    kind="web",
    ingestion_mode="applicationInsights",
    resource_group_name=resource_group.name)

sql_server = sql.Server(
    "appservice-sql",
    resource_group_name=resource_group.name,
    administrator_login=username,
    administrator_login_password=pwd,
    version="12.0")

database = sql.Database(
    "appservice-db",
    resource_group_name=resource_group.name,
    server_name=sql_server.name,
    sku=sql.SkuArgs(
        name="S0",
    ))

connection_string = Output.concat(
    "Server=tcp:", sql_server.name, ".database.windows.net;initial ",
    "catalog=", database.name,
    ";user ID=", username,
    ";password=", pwd,
    ";Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;")

app = web.WebApp(
    "appservice-as",
    resource_group_name=resource_group.name,
    server_farm_id=app_service_plan.id,
    site_config=web.SiteConfigArgs(
        app_settings=[
            web.NameValuePairArgs(name="APPINSIGHTS_INSTRUMENTATIONKEY", value=app_insights.instrumentation_key),
            web.NameValuePairArgs(name="APPLICATIONINSIGHTS_CONNECTION_STRING",
                                  value=app_insights.instrumentation_key.apply(
                                      lambda key: "InstrumentationKey=" + key
                                  )),
            web.NameValuePairArgs(name="ApplicationInsightsAgent_EXTENSION_VERSION", value="~2"),
            web.NameValuePairArgs(name="WEBSITE_RUN_FROM_PACKAGE", value=signed_blob_url)],
        connection_strings=[web.ConnStringInfoArgs(
            name="db",
            type="SQLAzure",
            connection_string=connection_string,
        )]
    )
)

export("endpoint", app.default_host_name.apply(
    lambda endpoint: "https://" + endpoint
))
