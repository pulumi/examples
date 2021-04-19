from pulumi import Config, get_stack, export, Output
import pulumi_azuread as ad
import pulumi_random as random
from pulumi_azure import core, containerservice

config = Config()
password = config.get_secret("password") or random.RandomPassword(
    "pwd",
    length=20,
    special=True).result
ssh_public_key = config.require("sshPublicKey")

resource_group=core.ResourceGroup("aksresourcegroup")

ad_app = ad.Application(
    "aks",
    display_name="aks")

ad_sp = ad.ServicePrincipal(
    "aksSp",
    application_id=ad_app.application_id)

ad_sp_password = ad.ServicePrincipalPassword(
    "aksSpPassword",
    service_principal_id=ad_sp.id,
    value=password,
    end_date="2099-01-01T00:00:00Z")

aks_cluster_config = [
    {"name": "east", "location": "eastus", "node_count": 2, "node_size": "Standard_D2_v2"},
    {"name": "west", "location": "westus", "node_count": 2, "node_size": "Standard_D2_v2"},
]

cluster_names = []
for config in aks_cluster_config:
    cluster = containerservice.KubernetesCluster(
        "aksCluster-%s" % config["name"],
        resource_group_name=resource_group.name,
        linux_profile=containerservice.KubernetesClusterLinuxProfileArgs(
            admin_username="aksuser",
            ssh_key=containerservice.KubernetesClusterLinuxProfileSshKeyArgs(
                key_data=ssh_public_key,
            ),
        ),
        service_principal=containerservice.KubernetesClusterServicePrincipalArgs(
            client_id=ad_app.application_id,
            client_secret=ad_sp_password.value
        ),
        location=config["location"],
        default_node_pool=containerservice.KubernetesClusterDefaultNodePoolArgs(
            name="aksagentpool",
            node_count=config["node_count"],
            vm_size=config["node_size"],
        ),
        dns_prefix="sample-kube",
    )
    cluster_names.append(cluster.name)

export("aks_cluster_names", Output.all(cluster_names))
