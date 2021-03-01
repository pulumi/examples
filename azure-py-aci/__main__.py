# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_azure_native import containerinstance
from pulumi_azure_native import resources

resource_group = resources.ResourceGroup("resourceGroup")

image_name = "mcr.microsoft.com/azuredocs/aci-helloworld"
container_group = containerinstance.ContainerGroup("containerGroup",
    resource_group_name=resource_group.name,
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
