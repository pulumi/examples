# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_azure_native.containerregistry as containerregistry
import pulumi_azure_native.resources as resources
import pulumi_azure_native.web as web
import pulumi_docker as docker

resource_group = resources.ResourceGroup(
    "resourceGroup",
)

plan = web.AppServicePlan(
    "plan",
    resource_group_name=resource_group.name,
    kind="Linux",
    reserved=True,
    sku=web.SkuDescriptionArgs(
        name="B1",
        tier="Basic",
    )
)

#
# Scenario 1: deploying an image from Docker Hub.
# The example uses a HelloWorld application written in Go.
# Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
#
image_in_docker_hub = "microsoft/azure-appservices-go-quickstart"

hello_app = web.WebApp(
    "helloApp",
    resource_group_name=resource_group.name,
    server_farm_id=plan.id,
    site_config=web.SiteConfigArgs(
        app_settings=[web.NameValuePairArgs(
            name="WEBSITES_ENABLE_APP_SERVICE_STORAGE",
            value="false"
        )],
        always_on=True,
        linux_fx_version=f"DOCKER|{image_in_docker_hub}",
    ),
    https_only=True)

pulumi.export(
    "helloEndpoint",
    hello_app.default_host_name.apply(lambda default_host_name: f"https://{default_host_name}/hello"))

#
# Scenario 2: deploying a custom image from Azure Container Registry.
#
custom_image = "node-app"
registry = containerregistry.Registry(
    "registry",
    resource_group_name=resource_group.name,
    sku=containerregistry.SkuArgs(
        name="Basic",
    ),
    admin_user_enabled=True)

credentials = containerregistry.list_registry_credentials_output(resource_group_name=resource_group.name,
                                                                 registry_name=registry.name)
admin_username = credentials.username
admin_password = credentials.passwords[0]["value"]

my_image = docker.Image(
    custom_image,
    image_name=registry.login_server.apply(
        lambda login_server: f"{login_server}/{custom_image}:v1.0.0"),
    build=docker.DockerBuild(context=f"./{custom_image}"),
    registry=docker.ImageRegistry(
        server=registry.login_server,
        username=admin_username,
        password=admin_password
    )
)

get_started_app = web.WebApp(
    "getStartedApp",
    resource_group_name=resource_group.name,
    server_farm_id=plan.id,
    site_config=web.SiteConfigArgs(
        app_settings=[
            web.NameValuePairArgs(name="WEBSITES_ENABLE_APP_SERVICE_STORAGE", value="false"),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_URL",
                                  value=registry.login_server.apply(
                                      lambda login_server: f"https://{login_server}")),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_USERNAME",
                                  value=admin_username),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_PASSWORD",
                                  value=admin_password),
            web.NameValuePairArgs(name="WEBSITES_PORT", value="80"),
        ],
        always_on=True,
        linux_fx_version=my_image.image_name.apply(lambda image_name: f"DOCKER|{image_name}"),
    ),
    https_only=True)

pulumi.export(
    "getStartedEndpoint",
    get_started_app.default_host_name.apply(lambda default_host_name: f"https://{default_host_name}"))
