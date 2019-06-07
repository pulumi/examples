import pulumi
from pulumi import ResourceOptions
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service
from pulumi_azure.core import ResourceGroup
from pulumi_azure.role import Assignment
from pulumi_azure.containerservice import KubernetesCluster, Registry
from pulumi_azure.network import VirtualNetwork, Subnet
from pulumi_azuread import Application, ServicePrincipal, ServicePrincipalPassword

# read and set config values
config = pulumi.Config("azure-py-aks")

PREFIX = config.require("prefix")
PASSWORD = config.require("password")
SSHKEY = config.require("sshkey")
LOCATION = config.get("location") or "east us"

# create a Resource Group and Network for all resources
resource_group = ResourceGroup("rg", name=PREFIX + "rg", location=LOCATION)

vnet = VirtualNetwork(
    "vnet",
    name=PREFIX + "vnet",
    location=resource_group.location,
    resource_group_name=resource_group.name,
    address_spaces=["10.0.0.0/16"],
    __opts__=ResourceOptions(parent=resource_group),
)

subnet = Subnet(
    "subnet",
    name=PREFIX + "subnet",
    resource_group_name=resource_group.name,
    address_prefix="10.0.0.0/24",
    virtual_network_name=vnet.name,
    __opts__=ResourceOptions(parent=vnet),
)

# create Azure Container Registry to store images in
acr = Registry(
    "acr",
    name=PREFIX + "acr",
    location=resource_group.location,
    resource_group_name=resource_group.name,
    sku="basic",
    __opts__=ResourceOptions(parent=resource_group),
)

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

# assignments are needed for AKS to be able to interact with those resources
acr_assignment = Assignment(
    "aks-acr-permissions",
    principal_id=sp.id,
    role_definition_name="AcrPull",
    scope=acr.id,
    __opts__=ResourceOptions(parent=sp),
)

subnet_assignment = Assignment(
    "aks-subnet-permissions",
    principal_id=sp.id,
    role_definition_name="Network Contributor",
    scope=subnet.id,
    __opts__=ResourceOptions(parent=sp),
)

aks = KubernetesCluster(
    "aks",
    name=PREFIX + "aks",
    location=resource_group.location,
    resource_group_name=resource_group.name,
    kubernetes_version="1.13.5",
    dns_prefix="dns",
    agent_pool_profiles=[
        {
            "name": "type1",
            "count": 2,
            "vmSize": "Standard_B2ms",
            "osType": "Linux",
            "maxPods": 110,
            "vnet_subnet_id": subnet.id,
        }
    ],
    linux_profile={"adminUsername": "azureuser", "ssh_key": {"keyData": SSHKEY}},
    service_principal={"clientId": app.application_id, "clientSecret": sppwd.value},
    role_based_access_control={"enabled": "true"},
    network_profile={
        "networkPlugin": "azure",
        "serviceCidr": "10.10.0.0/16",
        "dns_service_ip": "10.10.0.10",
        "dockerBridgeCidr": "172.17.0.1/16",
    },
    __opts__=ResourceOptions(
        parent=resource_group, depends_on=[acr_assignment, subnet_assignment]
    ),
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
