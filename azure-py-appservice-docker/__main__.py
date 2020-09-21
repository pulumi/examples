from pulumi_azure import core, appservice, containerservice
from pulumi import export

resource_group = core.ResourceGroup("samples")

plan = appservice.Plan(
    "linux-apps",
    resource_group_name=resource_group.name,
    kind="Linux",
    reserved=True,
    sku=appservice.PlanSkuArgs(
        tier="Basic",
        size="B1",
    ))

docker_image = "microsoft/azure-appservices-go-quickstart"

hello_app = appservice.AppService(
    "hello-app",
    resource_group_name=resource_group.name,
    app_service_plan_id=plan.id,
    app_settings={
        "WEBSITES_ENABLE_APP_SERVICE_STORAGE": "false",
    },
    site_config=appservice.AppServiceSiteConfigArgs(
        always_on=True,
        linux_fx_version="DOCKER|%s" % docker_image,
    ),
    https_only=True)

export("hello_endpoint", hello_app.default_site_hostname.apply(
    lambda endpoint: "https://" + endpoint + "/hello"
))
