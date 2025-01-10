# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_azure_native import resources, containerservice
import pulumi_azuread as ad


config = pulumi.Config()
password = config.get_secret("password")
ssh_public_key = config.require("sshPublicKey")
location = config.get("location") or "eastus"

resource_group=resources.ResourceGroup(
    "aks",
    location=location
)

ad_app = ad.Application(
    "aks",
    display_name="my-aks-multicluster",
)

ad_sp = ad.ServicePrincipal(
    "aksSp",
    application_id=ad_app.application_id
)

ad_sp_password = ad.ServicePrincipalPassword(
    "aksSpPassword",
    service_principal_id=ad_sp.id,
    value=password,
    end_date="2099-01-01T00:00:00Z"
)

aks_cluster_configs = [
    {
        "name": "east",
        "location": "eastus",
        "node_count": 2,
        "node_size": containerservice.ContainerServiceVMSizeTypes.STANDARD_D2_V2
    },
    {
        "name": "west",
        "location": "westus",
        "node_count": 2,
        "node_size": containerservice.ContainerServiceVMSizeTypes.STANDARD_D2_V2
    },
]

cluster_names = []
for cluster_config in aks_cluster_configs:
    cluster = containerservice.ManagedCluster(
        "aksCluster-{}".format(cluster_config["name"]),
        resource_group_name=resource_group.name,
        linux_profile=containerservice.ContainerServiceLinuxProfileArgs(
            admin_username="aksuser",
            ssh=containerservice.ContainerServiceSshConfigurationArgs(
                public_keys=[
                    containerservice.ContainerServiceSshPublicKeyArgs(
                        key_data=ssh_public_key,
                    )
                ],
            ),
        ),
        service_principal_profile=containerservice.ManagedClusterServicePrincipalProfileArgs(
            client_id=ad_app.application_id,
            secret=ad_sp_password.value
        ),
        location=cluster_config["location"],
        agent_pool_profiles=[containerservice.ManagedClusterAgentPoolProfileArgs(
            name="aksagentpool",
            mode=containerservice.AgentPoolMode.SYSTEM,
            count=cluster_config["node_count"],
            vm_size=cluster_config["node_size"],
        )],
        dns_prefix="{}-kube".format(pulumi.get_stack()),
        kubernetes_version="1.26.3"
    )
    cluster_names.append(cluster.name)

pulumi.export("aks_cluster_names", pulumi.Output.all(cluster_names))

