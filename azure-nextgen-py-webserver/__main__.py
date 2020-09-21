# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import base64
from pulumi import Config, Output, export
from pulumi_azure_nextgen.compute import latest as compute
from pulumi_azure_nextgen.network import latest as network
from pulumi_azure_nextgen.resources import latest as resources

config = Config()
location = config.get("location") or "westus"
username = config.require("username")
password = config.require("password")

resource_group = resources.ResourceGroup("server", 
    resource_group_name="server",
    location=location)

net = network.VirtualNetwork(
    "server-network",
    resource_group_name=resource_group.name,
    location=location,
    virtual_network_name="server-network",
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
    location=location,
    public_ip_address_name="server-ip",
    public_ip_allocation_method="Dynamic")

network_iface = network.NetworkInterface(
    "server-nic",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    network_interface_name="server-nic",
    ip_configurations=[network.NetworkInterfaceIPConfigurationArgs(
        name="webserveripcfg",
        subnet=network.SubnetArgs(id=net.subnets[0].id),
        private_ip_allocation_method="Dynamic",
        public_ip_address=network.PublicIPAddressArgs(id=public_ip.id),
    )])

init_script = """#!/bin/bash

echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &"""

vm = compute.VirtualMachine(
    "server-vm",
    resource_group_name=resource_group.name,
    location=location,
    vm_name="server-vm",
    network_profile=compute.NetworkProfileArgs(
        network_interfaces=[
            compute.NetworkInterfaceReferenceArgs(id=network_iface.id),
        ],
    ),
    hardware_profile=compute.HardwareProfileArgs(
        vm_size="Standard_A0",
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
            create_option="FromImage",
            name="myosdisk1",
        ),
        image_reference=compute.ImageReferenceArgs(
            publisher="canonical",
            offer="UbuntuServer",
            sku="16.04-LTS",
            version="latest",
        ),
    ))

combined_output = Output.all(vm.id, public_ip.name, resource_group.name)
public_ip_addr = combined_output.apply(
    lambda lst: network.get_public_ip_address(
        public_ip_address_name=lst[1], 
        resource_group_name=lst[2]))
export("public_ip", public_ip_addr.ip_address)
