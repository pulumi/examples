# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi import Config, Output, export
import pulumi_azure_native.compute as compute
import pulumi_azure_native.network as network
import pulumi_azure_native.resources as resources
import pulumi_command as command

# Get the config ready to go.
config = Config()
key_name = config.get('keyName')
public_key = config.get('publicKey')
admin_username = config.get('admin_username')
admin_password = config.get('admin_password')
location = config.get('location')


# The privateKey associated with the selected key must be provided (either directly or base64 encoded),
# along with an optional passphrase if needed.
def decode_key(key):
    if key.startswith('-----BEGIN RSA PRIVATE KEY-----'):
        return key
    return key.encode('ascii')


private_key = config.require_secret('privateKey').apply(decode_key)

# Create a resource group to hold project resources.
resource_group = resources.ResourceGroup("minecraft")

# Create a virtual network resource.
net = network.VirtualNetwork(
    "server-network",
    resource_group_name=resource_group.name,
    address_space=network.AddressSpaceArgs(
        address_prefixes=["10.0.0.0/16"],
    ),
    subnets=[network.SubnetArgs(
        name="default",
        address_prefix="10.0.0.0/24",
    )]
)

# Create a public IP to enable access on the Internet.
public_ip = network.PublicIPAddress(
    "server-ip",
    resource_group_name=resource_group.name,
    public_ip_allocation_method="Dynamic"
)

# Create the network interface for the server.
network_iface = network.NetworkInterface(
    "server-nic",
    resource_group_name=resource_group.name,
    ip_configurations=[network.NetworkInterfaceIPConfigurationArgs(
        name="webserveripcfg",
        subnet=network.SubnetArgs(id=net.subnets[0].id),
        private_ip_allocation_method="Dynamic",
        public_ip_address=network.PublicIPAddressArgs(id=public_ip.id),
    )]
)

# Create path to store ssh keys as a string.
ssh_path = "".join(["/home/", admin_username, "/.ssh/authorized_keys"])

# Create the virtual machine.
server = compute.VirtualMachine(
    "server-vm",
    resource_group_name=resource_group.name,
    network_profile=compute.NetworkProfileArgs(
        network_interfaces=[
            compute.NetworkInterfaceReferenceArgs(id=network_iface.id),
        ],
    ),
    hardware_profile=compute.HardwareProfileArgs(
        vm_size="Standard_A3",
    ),
    os_profile=compute.OSProfileArgs(
        computer_name="hostname",
        admin_username=admin_username,
        admin_password=admin_password,
        linux_configuration=compute.LinuxConfigurationArgs(
            disable_password_authentication=False,
            ssh={
                'publicKeys': [{
                    'keyData': public_key,
                    'path': ssh_path,
                }],
            },
        ),
    ),
    storage_profile=compute.StorageProfileArgs(
        os_disk=compute.OSDiskArgs(
            create_option="FromImage",
            name="myosdisk1",
            caching="ReadWrite",
            disk_size_gb=100,
        ),
        image_reference=compute.ImageReferenceArgs(
            publisher="canonical",
            offer="UbuntuServer",
            sku="18.04-LTS",
            version="latest",
        ),
    ),
)

# Get IP address as an output.
public_ip_addr = server.id.apply(lambda _:
    network.get_public_ip_address_output(
        public_ip_address_name=public_ip.name,
        resource_group_name=resource_group.name))

# Create connection object to server.
connection = command.remote.ConnectionArgs(
    host=public_ip_addr.ip_address,
    user=admin_username,
    private_key=private_key,
)

# Copy install script to server.
cp_config = command.remote.CopyFile(
    'config',
    connection=connection,
    local_path='install.sh',
    remote_path='install.sh',
    opts=pulumi.ResourceOptions(depends_on=[server]),
)

# Execute install script on server.
install = command.remote.Command(
    'install',
    connection=connection,
    create='sudo chmod 755 install.sh && sudo ./install.sh',
    opts=pulumi.ResourceOptions(depends_on=[cp_config]),
)

export("Minecraft Server IP Address", public_ip_addr.ip_address)
