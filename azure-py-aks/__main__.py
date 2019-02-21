import pulumi
from pulumi import ResourceOptions
from pulumi_azure.core import ResourceGroup
from pulumi_azure.role import Assignment
from pulumi_azure.ad import Application, ServicePrincipal, ServicePrincipalPassword
from pulumi_azure.containerservice import KubernetesCluster, Registry
from pulumi_azure.network import VirtualNetwork, Subnet

config = pulumi.Config('azure-py-kubernetes')
PREFIX = config.get('prefix') or 'replaceme'
PASSWORD = config.get('password') or 'DEf34tg!rg35y#F23'
SSHKEY = config.get('sshkey') or 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCxinIAIDDCradZPAgX5GzBLv00u4rigOLUbU00E44FrfMTqu5wXiejJ4ycSb1bI+//ZNgaB2UYRbPL7A9OUKY+K4sX5O84Q6DPMjo/90IANHVTLf3xTaSc7hpvXOtIjJTJeiamxClgnTAcR55RV/j9/Wptxa8GGcRmRCcSmJUkx5AZTFI+s8aF0W3aeHHRw7TxNKBuwrX7FDcHyGKvdkFg4OP863Xe5hp5ql1C3XibmCOp1CMPIU2hCmGOy1LGbOf/Pa+QKAdtUSrPNK/jBWvPWo0k02Ii0JtMAdlpVqnJc3czNIp5gEqZCRCGEdkb/kZnJiMRZhmLBYnC8tiMxvZj core@k8s'
LOCATION = config.get('location') or 'westeurope'

# create Azure AD Application for AKS
app = Application(
    'aks-app',
    name=PREFIX + 'aks-app'
)

# create service principal for the application so AKS can act on behalf of the application
sp = ServicePrincipal(
    'aks-sp',
    application_id=app.application_id
)

# create service principal password
sppwd = ServicePrincipalPassword(
    'aks-sp-pwd',
    service_principal_id=sp.id,
    end_date='2025-01-01T01:02:03Z',
    value=PASSWORD
)

rg = ResourceGroup(
    'rg',
    name=PREFIX + 'rg',
    location=LOCATION
)

vnet = VirtualNetwork(
    'vnet',
    name=PREFIX + 'vnet',
    location=rg.location,
    resource_group_name=rg.name,
    address_spaces=['10.0.0.0/8']
)

subnet = Subnet(
    'subnet',
    name=PREFIX + 'subnet',
    resource_group_name=rg.name,
    address_prefix='10.0.0.0/23',
    virtual_network_name=vnet.name
)

# create Azure Container Registry to store images in
acr = Registry(
    'acr',
    name=PREFIX + 'acr',
    location=rg.location,
    resource_group_name=rg.name,
    sku="basic"
)

# assignments are needed for AKS to be able to interact with those resources
acr_assignment = Assignment(
    'acr-permissions',
    principal_id=sp.id,
    role_definition_name='AcrPull',
    scope=acr.id
)

subnet_assignment = Assignment(
    'subnet-permissions',
    principal_id=sp.id,
    role_definition_name='Network Contributor',
    scope=subnet.id
)

aks = KubernetesCluster(
    'aks',
    name=PREFIX + 'aks',
    location=rg.location,
    resource_group_name=rg.name,
    kubernetes_version="1.12.5",
    dns_prefix="dns",
    agent_pool_profile=(
        {
            "name": "type1",
            "count": 2,
            "vmSize": "Standard_B2ms",
            "osType": "Linux",
            "maxPods": 110,
            "vnet_subnet_id": subnet.id
        }
    ),
    linux_profile=(
        {
            "adminUsername": "azureuser",
            "ssh_key": [
                {
                    "keyData": SSHKEY
                }
            ]
        }
    ),
    service_principal={
        "clientId": app.application_id,
        "clientSecret": sppwd.value
    },
    role_based_access_control={
        "enabled": "true"
    },
    network_profile=(
        {
            "networkPlugin": "azure",
            "serviceCidr": "10.10.0.0/16",
            "dns_service_ip": "10.10.0.10",
            "dockerBridgeCidr": "172.17.0.1/16"
        }
    ), __opts__=ResourceOptions(depends_on=[acr_assignment, subnet_assignment])
)

pulumi.export('kubeconfig', aks.kube_config_raw)
