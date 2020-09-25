import pulumi
from pulumi import ResourceOptions
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import (
    ContainerArgs,
    PodSpecArgs,
    PodTemplateSpecArgs,
    Service,
    ServicePortArgs,
    ServiceSpecArgs,
)
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs
from pulumi_azure.core import ResourceGroup
from pulumi_azure.containerservice import (
    KubernetesCluster,
    KubernetesClusterDefaultNodePoolArgs,
    KubernetesClusterLinuxProfileArgs,
    KubernetesClusterLinuxProfileSshKeyArgs,
    KubernetesClusterServicePrincipalArgs,
)
from pulumi_azuread import Application, ServicePrincipal, ServicePrincipalPassword

# read and set config values
config = pulumi.Config("azure-py-aks")

PASSWORD = config.require_secret("password")
SSHKEY = config.require("sshkey")

# create a Resource Group and Network for all resources
resource_group = ResourceGroup("aks-rg")

# create Azure AD Application for AKS
app = Application("aks-app")

# create service principal for the application so AKS can act on behalf of the application
sp = ServicePrincipal(
    "aks-app-sp",
    application_id=app.application_id,
)

# create service principal password
sppwd = ServicePrincipalPassword(
    "aks-app-sp-pwd",
    service_principal_id=sp.id,
    end_date="2099-01-01T00:00:00Z",
    value=PASSWORD,
)

aks = KubernetesCluster(
    "aksCluster",
    resource_group_name=resource_group.name,
    kubernetes_version="1.18.6",
    dns_prefix="dns",
    linux_profile=KubernetesClusterLinuxProfileArgs(
        admin_username="aksuser",
        ssh_key=KubernetesClusterLinuxProfileSshKeyArgs(
            key_data=SSHKEY
        )
    ),
    service_principal=KubernetesClusterServicePrincipalArgs(
        client_id=app.application_id,
        client_secret=sppwd.value
    ),
    default_node_pool=KubernetesClusterDefaultNodePoolArgs(
        name="type1",
        node_count=2,
        vm_size="Standard_B2ms",
    ),
)

k8s_provider = Provider(
    "k8s", kubeconfig=aks.kube_config_raw,
)

labels = {"app": "nginx"}
nginx = Deployment(
    "k8s-nginx",
    spec=DeploymentSpecArgs(
        selector=LabelSelectorArgs(match_labels=labels),
        replicas=1,
        template=PodTemplateSpecArgs(
            metadata=ObjectMetaArgs(labels=labels),
            spec=PodSpecArgs(containers=[ContainerArgs(name="nginx", image="nginx")]),
        ),
    ),
    opts=ResourceOptions(parent=k8s_provider, provider=k8s_provider),
)

ingress = Service(
    "k8s-nginx",
    spec=ServiceSpecArgs(type="LoadBalancer", selector=labels, ports=[ServicePortArgs(port=80)]),
    opts=ResourceOptions(parent=k8s_provider, provider=k8s_provider),
)

pulumi.export("kubeconfig", aks.kube_config_raw)
