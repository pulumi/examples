# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_azure_native import containerregistry
from pulumi_azure_native import operationalinsights
from pulumi_azure_native import resources
import pulumi_azure_native.web.v20210301 as web
import pulumi_docker as docker

resource_group = resources.ResourceGroup("rg")

workspace = operationalinsights.Workspace("loganalytics",
    resource_group_name=resource_group.name,
    sku=operationalinsights.WorkspaceSkuArgs(name="PerGB2018"),
    retention_in_days=30)

workspace_shared_keys = pulumi.Output.all(resource_group.name, workspace.name) \
    .apply(lambda args: operationalinsights.get_shared_keys(
        resource_group_name=args[0],
        workspace_name=args[1]
    ))

kube_env = web.KubeEnvironment("env",
    resource_group_name=resource_group.name,
    type="Managed",
    app_logs_configuration=web.AppLogsConfigurationArgs(
        destination="log-analytics",
        log_analytics_configuration=web.LogAnalyticsConfigurationArgs(
            customer_id=workspace.customer_id,
            shared_key=workspace_shared_keys.apply(lambda r: r.primary_shared_key)
    )))

registry = containerregistry.Registry("registry",
    resource_group_name=resource_group.name,
    sku=containerregistry.SkuArgs(name="Basic"),
    admin_user_enabled=True)

credentials = pulumi.Output.all(resource_group.name, registry.name).apply(
    lambda args: containerregistry.list_registry_credentials(resource_group_name=args[0],
                                                             registry_name=args[1]))
admin_username = credentials.username
admin_password = credentials.passwords[0]["value"]

custom_image = "node-app"
my_image = docker.Image(custom_image,
    image_name=registry.login_server.apply(
        lambda login_server: f"{login_server}/{custom_image}:v1.0.0"),
    build=docker.DockerBuild(context=f"./{custom_image}"),
    registry=docker.ImageRegistry(
        server=registry.login_server,
        username=admin_username,
        password=admin_password))

container_app = web.ContainerApp("app",
    resource_group_name=resource_group.name,
    kube_environment_id=kube_env.id,
    configuration=web.ConfigurationArgs(
        ingress=web.IngressArgs(
            external=True,
            target_port=80
        ),
        registries=[
            web.RegistryCredentialsArgs(
                server=registry.login_server,
                username=admin_username,
                password_secret_ref="pwd")
        ],
        secrets=[
            web.SecretArgs(
                name="pwd",
                value=admin_password)
        ],
    ),
    template=web.TemplateArgs(
        containers = [
            web.ContainerArgs(
                name="myapp",
                image=my_image.image_name)
        ]))

pulumi.export("url", container_app.configuration.apply(lambda c: c.ingress).apply(lambda i: i.fqdn))
