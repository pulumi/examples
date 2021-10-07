# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import base64
from pulumi import Config, Output, export
import pulumi_azure_native.compute as compute
import pulumi_azure_native.network as network
import pulumi_azure_native.resources as resources

config = Config()
username = config.require("username")
password = config.require("password")

resource_group = resources.ResourceGroup("server")

net = network.VirtualNetwork(
    "server-network",
    resource_group_name=resource_group.name,
    address_space=network.AddressSpaceArgs(
        address_prefixes=["10.0.0.0/16"],
    ),
    subnets=[network.SubnetArgs(
        name="default",
        address_prefix="10.0.1.0/24",
    )])

public_ip = network.PublicIPAddress(
    "server-ip",
    resource_group_name=resource_group.name,
    public_ip_allocation_method=network.IPAllocationMethod.DYNAMIC)

network_iface = network.NetworkInterface(
    "server-nic",
    resource_group_name=resource_group.name,
    ip_configurations=[network.NetworkInterfaceIPConfigurationArgs(
        name="webserveripcfg",
        subnet=network.SubnetArgs(id=net.subnets[0].id),
        private_ip_allocation_method=network.IPAllocationMethod.DYNAMIC,
        public_ip_address=network.PublicIPAddressArgs(id=public_ip.id),
    )])

init_script = """#!/bin/bash

echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &"""

vm = compute.VirtualMachine(
    "server-vm",
    resource_group_name=resource_group.name,
    network_profile=compute.NetworkProfileArgs(
        network_interfaces=[
            compute.NetworkInterfaceReferenceArgs(id=network_iface.id),
        ],
    ),
    hardware_profile=compute.HardwareProfileArgs(
        vm_size=compute.VirtualMachineSizeTypes.STANDARD_A0,
    ),
    os_profile=compute.OSProfileArgs(
        computer_name="hostname",
        admin_username=username,
        admin_password=password,
        custom_data=base64.b64encode(init_script.encode("ascii")).decode("ascii"),
        linux_configuration=compute.LinuxConfigurationArgs(
            disable_password_authentication=False,
        ),
    ),
    storage_profile=compute.StorageProfileArgs(
        os_disk=compute.OSDiskArgs(
            create_option=compute.DiskCreateOptionTypes.FROM_IMAGE,
            name="myosdisk1",
        ),
        image_reference=compute.ImageReferenceArgs(
            publisher="canonical",
            offer="UbuntuServer",
            sku="16.04-LTS",
            version="latest",
        ),
    ))

public_ip_addr = vm.id.apply(lambda _: network.get_public_ip_address_output(
    public_ip_address_name=public_ip.name,
    resource_group_name=resource_group.name))

export("public_ip", public_ip_addr.ip_address)
