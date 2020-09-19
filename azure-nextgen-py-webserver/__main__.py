import base64
from pulumi import Config, Output, export
from pulumi_azure_nextgen import resources, compute, network

config = Config()
location = config.get("location") or "westus"
username = config.require("username")
password = config.require("password")

resource_group = resources.latest.ResourceGroup("server", 
    resource_group_name="server",
    location=location)

net = network.latest.VirtualNetwork(
    "server-network",
    resource_group_name=resource_group.name,
    location=location,
    virtual_network_name="server-network",
    address_space=network.latest.AddressSpaceArgs(
        address_prefixes=["10.0.0.0/16"],
    ),
    subnets=[network.latest.SubnetArgs(
        name="default",
        address_prefix="10.0.1.0/24",
    )])

public_ip = network.latest.PublicIPAddress(
    "server-ip",
    resource_group_name=resource_group.name,
    location=location,
    public_ip_address_name="server-ip",
    public_ip_allocation_method="Dynamic")

network_iface = network.latest.NetworkInterface(
    "server-nic",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    network_interface_name="server-nic",
    ip_configurations=[network.latest.NetworkInterfaceIPConfigurationArgs(
        name="webserveripcfg",
        subnet=network.latest.SubnetArgs(id=net.subnets[0].id),
        private_ip_allocation_method="Dynamic",
        public_ip_address=network.latest.PublicIPAddressArgs(id=public_ip.id),
    )])

init_script = """#!/bin/bash

echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &"""

vm = compute.latest.VirtualMachine(
    "server-vm",
    resource_group_name=resource_group.name,
    location=location,
    vm_name="server-vm",
    network_profile=compute.latest.NetworkProfileArgs(
        network_interfaces=[
            compute.latest.NetworkInterfaceReferenceArgs(id=network_iface.id),
        ],
    ),
    hardware_profile=compute.latest.HardwareProfileArgs(
        vm_size="Standard_A0",
    ),
    os_profile=compute.latest.OSProfileArgs(
        computer_name="hostname",
        admin_username=username,
        admin_password=password,
        custom_data=base64.b64encode(init_script.encode("ascii")).decode("ascii"),
        linux_configuration=compute.latest.LinuxConfigurationArgs(
            disable_password_authentication=False,
        ),
    ),
    storage_profile=compute.latest.StorageProfileArgs(
        os_disk=compute.latest.OSDiskArgs(
            create_option="FromImage",
            name="myosdisk1",
        ),
        image_reference=compute.latest.ImageReferenceArgs(
            publisher="canonical",
            offer="UbuntuServer",
            sku="16.04-LTS",
            version="latest",
        ),
    ))

combined_output = Output.all(vm.id, public_ip.name, resource_group.name)
public_ip_addr = combined_output.apply(
    lambda lst: network.latest.get_public_ip_address(
        public_ip_address_name=lst[1], 
        resource_group_name=lst[2]))
export("public_ip", public_ip_addr.ip_address)
