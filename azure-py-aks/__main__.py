import pulumi
from pulumi import ResourceOptions
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service
from pulumi_azure.core import ResourceGroup
from pulumi_azure.containerservice import KubernetesCluster
from pulumi_azuread import Application, ServicePrincipal, ServicePrincipalPassword

# read and set config values
config = pulumi.Config("azure-py-aks")

PREFIX = config.require("prefix")
PASSWORD = config.require_secret("password")
SSHKEY = config.require("sshkey")
LOCATION = config.get("location") or "east us"

# create a Resource Group and Network for all resources
resource_group = ResourceGroup("rg", name=PREFIX + "rg", location=LOCATION)

# create Azure AD Application for AKS
app = Application("aks-app", name=PREFIX + "aks-app")

# create service principal for the application so AKS can act on behalf of the application
sp = ServicePrincipal(
    "aks-app-sp",
    application_id=app.application_id,
    __opts__=ResourceOptions(parent=app),
)

# create service principal password
sppwd = ServicePrincipalPassword(
    "aks-app-sp-pwd",
    service_principal_id=sp.id,
    end_date="2025-01-01T01:02:03Z",
    value=PASSWORD,
    __opts__=ResourceOptions(parent=sp),
)

aks = KubernetesCluster(
    "aks",
    name=PREFIX + "aks",
    location=resource_group.location,
    resource_group_name=resource_group.name,
    kubernetes_version="1.14.6",
    dns_prefix="dns",
    linux_profile={"adminUsername": "azureuser", "ssh_key": {"keyData": SSHKEY}},
    service_principal={"clientId": app.application_id, "clientSecret": sppwd.value},
    agent_pool_profiles=[
        {
            "name": "type1",
            "count": 2,
            "vmSize": "Standard_B2ms",
        }
    ],
)

k8s_provider = Provider(
    "k8s", kubeconfig=aks.kube_config_raw, __opts__=ResourceOptions(parent=aks)
)

labels = {"app": "nginx"}
nginx = Deployment(
    "k8s-nginx",
    spec={
        "selector": {"matchLabels": labels},
        "replicas": 1,
        "template": {
            "metadata": {"labels": labels},
            "spec": {"containers": [{"name": "nginx", "image": "nginx"}]},
        },
    },
    __opts__=ResourceOptions(parent=k8s_provider, provider=k8s_provider),
)

ingress = Service(
    "k8s-nginx",
    spec={"type": "LoadBalancer", "selector": labels, "ports": [{"port": 80}]},
    __opts__=ResourceOptions(parent=k8s_provider, provider=k8s_provider),
)

pulumi.export("kubeconfig", aks.kube_config_raw)
