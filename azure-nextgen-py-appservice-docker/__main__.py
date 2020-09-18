# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_azure_nextgen.containerregistry import latest as containerregistry
from pulumi_azure_nextgen.resources import latest as resources
from pulumi_azure_nextgen.storage import latest as storage
from pulumi_azure_nextgen.web import latest as web
import pulumi_docker as docker
import pulumi_random as random

config = pulumi.Config()
location = config.get("location") or "WestUS"

resource_group = resources.ResourceGroup("resourceGroup",
    resource_group_name="appservice-docker-rg",
    location=location)

plan = web.AppServicePlan("plan",
    resource_group_name=resource_group.name,
    name="linux-asp",
    location=resource_group.location,
    kind="Linux",
    reserved=True,
    sku=web.SkuDescriptionArgs(
        name="B1",
        tier="Basic",
    )
)

suffix = random.RandomString("suffix",
    length=6,
    special=False,
    upper=False)

#
# Scenario 1: deploying an image from Docker Hub.
# The example uses a HelloWorld application written in Go.
# Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
#
image_in_docker_hub = "microsoft/azure-appservices-go-quickstart"

hello_app = web.WebApp("helloApp",
    resource_group_name=resource_group.name,
    location=plan.location,
    name=suffix.result.apply(lambda result: f"hello-app-{result}"),
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

pulumi.export("helloEndpoint", hello_app.default_host_name.apply(lambda default_host_name: f"https://{default_host_name}/hello"))

#
# Scenario 2: deploying a custom image from Azure Container Registry.
#
custom_image = "node-app"
registry = containerregistry.Registry("registry",
    resource_group_name=resource_group.name,
    registry_name=suffix.result.apply(lambda result: f"registry{result}"),
    location=resource_group.location,
    sku=containerregistry.SkuArgs(
        name="Basic",
    ),
    admin_user_enabled=True)

credentials = pulumi.Output.all(resource_group.name, registry.name).apply(lambda args: containerregistry.list_registry_credentials(resource_group_name=args[0],
    registry_name=args[1]))
admin_username = credentials.username
admin_password = credentials.passwords[0]["value"]

my_image = docker.Image(custom_image,
    image_name=registry.login_server.apply(lambda login_server: f"{login_server}/{custom_image}:v1.0.0"),
    build=docker.DockerBuild(context=f"./{custom_image}"),
    registry=docker.ImageRegistry(
        server=registry.login_server,
        username=admin_username,
        password=admin_password
    )
)

get_started_app = web.WebApp("getStartedApp",
    resource_group_name=resource_group.name,
    location=plan.location,
    name=suffix.result.apply(lambda result: f"get-started-{result}"),
    server_farm_id=plan.id,
    site_config=web.SiteConfigArgs(
        app_settings=[
            web.NameValuePairArgs(name="WEBSITES_ENABLE_APP_SERVICE_STORAGE", value="false"),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_URL", value=registry.login_server.apply(lambda login_server: f"https://{login_server}")),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_USERNAME", value=admin_username),
            web.NameValuePairArgs(name="DOCKER_REGISTRY_SERVER_PASSWORD", value=admin_password),
            web.NameValuePairArgs(name="WEBSITES_PORT", value="80"),
        ],
        always_on=True,
        linux_fx_version=my_image.image_name.apply(lambda image_name: f"DOCKER|{image_name}"),
    ),
    https_only=True)

pulumi.export("getStartedEndpoint", get_started_app.default_host_name.apply(lambda default_host_name: f"https://{default_host_name}"))
