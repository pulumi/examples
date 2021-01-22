import pulumi
import pulumi_gcp
from pulumi import Output, Config
from pulumi_gcp.cloudrun import (
    ServiceTemplateMetadataArgs,
    ServiceTemplateSpecContainerEnvArgs,
)

config = Config()

cloud_sql_instance = pulumi_gcp.sql.DatabaseInstance(
    "my-cloud-sql-instance",
    database_version="POSTGRES_12",
    deletion_protection=False,
    settings=pulumi_gcp.sql.DatabaseInstanceSettingsArgs(tier="db-f1-micro"),
)

database = pulumi_gcp.sql.Database(
    "database", instance=cloud_sql_instance.name, name=config.require("db-name")
)

users = pulumi_gcp.sql.User(
    "users",
    name=config.require("db-name"),
    instance=cloud_sql_instance.name,
    password=config.require_secret("db-password"),
)

sql_instance_url = Output.concat(
    "postgres://",
    config.require("db-name"),
    ":",
    config.require_secret("db-password"),
    "@/",
    config.require("db-name"),
    "?host=/cloudsql/",
    cloud_sql_instance.connection_name,
)

cloud_run = pulumi_gcp.cloudrun.Service(
    "default-service",
    location=Config("gcp").require("region"),
    template=pulumi_gcp.cloudrun.ServiceTemplateArgs(
        metadata=ServiceTemplateMetadataArgs(
            annotations={
                "run.googleapis.com/cloudsql-instances": cloud_sql_instance.connection_name
            }
        ),
        spec=pulumi_gcp.cloudrun.ServiceTemplateSpecArgs(
            containers=[
                pulumi_gcp.cloudrun.ServiceTemplateSpecContainerArgs(
                    image="gcr.io/cloudrun/hello",
                    envs=[
                        ServiceTemplateSpecContainerEnvArgs(
                            name="DATABASE_URL",
                            value=sql_instance_url,
                        )
                    ],
                )
            ],
        ),
    ),
    traffics=[
        pulumi_gcp.cloudrun.ServiceTrafficArgs(
            latest_revision=True,
            percent=100,
        )
    ],
)

pulumi.export("cloud_sql_instance_name", cloud_sql_instance.name)
pulumi.export("cloud_run_url", cloud_run.statuses[0].url)
