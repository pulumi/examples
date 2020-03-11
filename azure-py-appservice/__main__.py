from pulumi import Config, export, asset, Output
from pulumi_azure import core, storage, appservice, appinsights, sql

username = "pulumi"

config = Config()
pwd = config.require("sqlPassword")

resource_group = core.ResourceGroup("appservicerg")

storage_account = storage.Account(
    "appservicesa",
    resource_group_name=resource_group.name,
    account_kind="StorageV2",
    account_tier="Standard",
    account_replication_type="LRS")

app_service_plan = appservice.Plan(
    "appservice-asp",
    resource_group_name=resource_group.name,
    kind="App",
    sku={
        "tier": "Basic",
        "size": "B1",
    })

storage_container = storage.Container(
    "appservice-c",
    storage_account_name=storage_account.name,
    container_access_type="private")

blob = storage.Blob(
    "appservice-b",
    storage_account_name=storage_account.name,
    storage_container_name=storage_container.name,
    type="Block",
    source=asset.FileArchive("wwwroot"))

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

signed_blob_url = Output.all(
    storage_account.name,
    storage_account.primary_connection_string,
    storage_account.name,
    blob.name
).apply(get_sas)

app_insights = appinsights.Insights(
    "appservice-ai",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    application_type="web")

sql_server = sql.SqlServer(
    "appservice-sql",
    resource_group_name=resource_group.name,
    administrator_login=username,
    administrator_login_password=pwd,
    version="12.0")

database = sql.Database(
    "appservice-db",
    resource_group_name=resource_group.name,
    server_name=sql_server.name,
    requested_service_objective_name="S0")

connection_string = Output.all(sql_server.name, database.name, username, pwd) \
    .apply(lambda args: f"Server=tcp:{args[0]}.database.windows.net;initial catalog={args[1]};user ID={args[2]};password={args[3]};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;")

app=appservice.AppService(
    "appservice-as",
    resource_group_name=resource_group.name,
    app_service_plan_id=app_service_plan.id,
    app_settings={
        "WEBSITE_RUN_FROM_ZIP": signed_blob_url,
        "ApplicationInsights:InstrumentationKey": app_insights.instrumentation_key,
        "APPINSIGHTS_INSTRUMENTATIONKEY": app_insights.instrumentation_key,
    },
    connection_strings=[{
        "name": "db",
        "type": "SQLAzure",
        "value": connection_string
    }]
)

export("endpoint", app.default_site_hostname.apply(
    lambda endpoint: "https://" + endpoint
))
