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

blob = storage.ZipBlob(
    "appservice-b",
    resource_group_name=resource_group.name,
    storage_account_name=storage_account.name,
    storage_container_name=storage_container.name,
    type="block",
    content=asset.FileArchive("wwwroot"))

account_sas=storage.get_account_sas(
    connection_string=storage_account.primary_connection_string,
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

app_insights = appinsights.Insights(
    "appservice-ai",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    application_type="Web")

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

signed_blob_url = Output.all(storage_account.name, storage_container.name, blob.name, account_sas.sas) \
    .apply(lambda args: f"https://{args[0]}.blob.core.windows.net/{args[1]}/{args[2]}{args[3]}")
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
