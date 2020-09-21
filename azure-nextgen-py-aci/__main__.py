# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_azure_nextgen.containerinstance import latest as containerinstance
from pulumi_azure_nextgen.resources import latest as resources

config = pulumi.Config()
location = config.get("location") or "WestUS"

resource_group = resources.ResourceGroup("resourceGroup",
    resource_group_name="aci-rg",
    location=location)

image_name = "mcr.microsoft.com/azuredocs/aci-helloworld"
container_group = containerinstance.ContainerGroup("containerGroup",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    container_group_name="helloworld",
    os_type="Linux",
    containers=[containerinstance.ContainerArgs(
        name="acilinuxpublicipcontainergroup",
        image=image_name,
        ports=[containerinstance.ContainerPortArgs(port=80)],
        resources=containerinstance.ResourceRequirementsArgs(
            requests=containerinstance.ResourceRequestsArgs(
                cpu=1.0,
                memory_in_gb=1.5,
            )
        ),
    )],
    ip_address=containerinstance.IpAddressArgs(
        ports=[containerinstance.PortArgs(
            port=80,
            protocol="Tcp",
        )],
        type="Public",
    ),
    restart_policy="always",
)

pulumi.export("containerIPv4Address", container_group.ip_address.apply(lambda ip: ip.ip))
