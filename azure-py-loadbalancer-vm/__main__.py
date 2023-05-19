from pulumi import (
    Config,
    Output,
    get_project,
    export,
    ResourceOptions
)

from pulumi_azure_native import (
    resources,
    network,
    compute,
    authorization
)

from pulumi_random import random_string
import base64

import utils

# Import the program's configuration settings.
config = Config()
username = config.require("username")
password = config.require("password")

# Retrieve the Azure subscription ID for later use.
az = authorization.get_client_config()

# Project name will become a base part of each resources name.
project = get_project()

# Create a resource group.
resource_group = resources.ResourceGroup(f"{project}-resource-group")

base_cidr = "10.0.0.0/16"

# Create a virtual network.
vnet = network.VirtualNetwork(
    f"{project}-network",
    resource_group_name=resource_group.name,
    address_space=network.AddressSpaceArgs(
        address_prefixes=[
            base_cidr,
        ],
    ),
    subnets=[
        network.SubnetArgs(
            name="default",
            address_prefix="10.0.1.0/24",
        ),
    ],
)

# Use a random string to give the LoadBalancer a unique DNS name.
lb_domain_name_label = random_string.RandomString(
    f"{project}-lb-domain-label",
    length=8,
    upper=False,
    special=False,
).result.apply(lambda result: f"{project}-{result}")

# Create a public IP address for the VM.
lb_public_ip = network.PublicIPAddress(
    f"{project}-lb-public-ip",
    resource_group_name=resource_group.name,
    public_ip_allocation_method=network.IpAllocationMethod.STATIC,
    public_ip_address_version="IPV4",
    dns_settings=network.PublicIPAddressDnsSettingsArgs(
        domain_name_label=lb_domain_name_label
    ),
    sku=network.PublicIPAddressSkuArgs(
        name="Standard"
    )
)

# We are required to create the IDs for these resources due to how the Azure API structures LoadBalancers.
lb_name = f"{project}-lb"
lb_id = Output.concat(
    "/subscriptions/",
    az.subscription_id,
    "/resourceGroups/",
    resource_group.name,
    "/providers/Microsoft.Network/loadBalancers/",
    lb_name
)

lb_backend_name = f"{lb_name}-backend"
lb_backend_id = Output.concat(
    lb_id,
    "/backendAddressPools/",
    lb_backend_name
)

lb_frontend_name = f"{lb_name}-frontend"
lb_frontend_id = Output.concat(
    lb_id,
    "/frontendIPConfigurations/",
    lb_frontend_name
)

lb_probe_name = f"{lb_name}-probe"
lb_probe_id = Output.concat(
    lb_id,
    "/probes/",
    lb_probe_name
)

lb = network.LoadBalancer(
    lb_name,
    backend_address_pools=[
        network.BackendAddressPoolArgs(
            name=lb_backend_name,
        ),
    ],
    frontend_ip_configurations=[
        network.FrontendIPConfigurationArgs(
            name=lb_frontend_name,
            public_ip_address=network.PublicIPAddressArgs(
                id=lb_public_ip.id,
            ),
        ),
    ],
    load_balancer_name=lb_name,
    load_balancing_rules=[network.LoadBalancingRuleArgs(
        backend_address_pool=network.SubResourceArgs(
            id=lb_backend_id,
        ),
        backend_port=80,
        disable_outbound_snat=False,
        enable_floating_ip=False,
        enable_tcp_reset=True,
        frontend_ip_configuration=network.SubResourceArgs(
            id=lb_frontend_id,
        ),
        frontend_port=80,
        idle_timeout_in_minutes=4,
        load_distribution="Default",
        name=f"{lb_name}-rule1",
        probe=network.SubResourceArgs(
            id=lb_probe_id,
        ),
        protocol="TCP",
    )],
    probes=[network.ProbeArgs(
        interval_in_seconds=5,
        name=lb_probe_name,
        number_of_probes=1,
        port=80,
        protocol="HTTP",
        request_path="/",
    )],
    resource_group_name=resource_group.name,
    sku=network.LoadBalancerSkuArgs(
        name="Standard",
    ),
)

# Create a security group allowing inbound access over port 80 (for HTTP).
security_group = network.NetworkSecurityGroup(
    f"{project}-security-group",
    resource_group_name=resource_group.name,
    security_rules=[
        network.SecurityRuleArgs(
            name=f"{project}-securityrule",
            protocol="TCP",
            source_port_range="*",
            destination_port_ranges=["80"],
            source_address_prefix="Internet",
            destination_address_prefix=base_cidr,
            access="Allow",
            priority=100,
            direction=network.AccessRuleDirection.INBOUND,
        ),
    ],
)

# Create a network interface with the virtual network, IP address, and security group
# that will be used by the LB's backend pool.
nic = network.NetworkInterface(
    f"{project}-network-interface",
    resource_group_name=resource_group.name,
    network_security_group=network.NetworkSecurityGroupArgs(
        id=security_group.id,
    ),
    ip_configurations=[
        network.NetworkInterfaceIPConfigurationArgs(
            name="webserver-ipconfiguration",
            private_ip_allocation_method=network.IpAllocationMethod.DYNAMIC,
            subnet=network.SubnetArgs(id=vnet.subnets[0].id),
            load_balancer_backend_address_pools=[
                network.BackendAddressPoolArgs(
                    id=lb_backend_id,
                ),
            ],
        ),
    ],
    opts=ResourceOptions(depends_on=[lb])
)

# Define a script to be run when the VM starts up.
init_script = """#!/bin/bash

echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &"""

# Create the virtual machine.
vm = compute.VirtualMachine(
    project,
    resource_group_name=resource_group.name,
    network_profile=compute.NetworkProfileArgs(
        network_interfaces=[
            compute.NetworkInterfaceReferenceArgs(id=nic.id),
        ],
    ),
    hardware_profile=compute.HardwareProfileArgs(
        vm_size=compute.VirtualMachineSizeTypes.STANDARD_A0,
    ),
    os_profile=compute.OSProfileArgs(
        computer_name="hostname",
        admin_username=username,
        admin_password=password,
        custom_data=base64.b64encode(
            init_script.encode("ascii")).decode("ascii"),
        linux_configuration=compute.LinuxConfigurationArgs(
            disable_password_authentication=False,
        ),
    ),
    storage_profile=compute.StorageProfileArgs(
        os_disk=compute.OSDiskArgs(
            create_option=compute.DiskCreateOptionTypes.FROM_IMAGE,
        ),
        image_reference=compute.ImageReferenceArgs(
            publisher="canonical",
            offer="UbuntuServer",
            sku="16.04-LTS",
            version="latest",
        ),
    ),
)

# Export the LB's public IP address and HTTP URL.
lb_address = utils.get_ip_address(resource_group.name, lb_public_ip.name)
export("lb-ip", lb_address.ip_address)
export("fqdn", lb_address.dns_settings.apply(
    lambda result: f"http://{result.fqdn}"))
