import pulumi
from pulumi_azure import compute,core,network,storage

config = pulumi.Config('webserver-azure')
username = config.require('username')
password = config.require('password')

resource_group = core.ResourceGroup('server',
    location='West US',
)

vnet = network.VirtualNetwork('server-network',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    address_spaces=['10.0.0.0/16'],
)

subnets = {
    'default': '10.0.1.0/24',
    'server-subnet': '10.0.2.0/24',
}
for name, prefix in subnets.iteritems():
    subnet = network.Subnet(name,
        resource_group_name=resource_group.name,
        virtual_network_name=vnet.name,
        address_prefix=prefix,
    )

public_ip = network.PublicIp('server-ip',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    public_ip_address_allocation='Dynamic',
)

nic = network.NetworkInterface('server-nic',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    ip_configurations=[{
        'name': 'ipconfig1',
        'subnet_id': subnet.id,
        'private_ip_address_allocation': 'Dynamic',
        'public_ip_address_id': public_ip.id,
    }]
)

sa = storage.Account('diagnostics',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    account_replication_type='LRS',
    account_tier='Standard',
)

user_data = """#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &
"""

vm = compute.VirtualMachine('server-vm',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    network_interface_ids=[nic.id],
    vm_size='Standard_A0',
    delete_data_disks_on_termination=True,
    delete_os_disk_on_termination=True,
    os_profile={
        'computer_name': 'hostname',
        'admin_username': username,
        'admin_password': password,
        'custom_data': user_data,
    },
    os_profile_linux_config={
        'disable_password_authentication': False,
    },
    storage_os_disk={
        'create_option': 'FromImage',
        'name': 'myosdisk1',
    },
    storage_image_reference={
        'publisher': 'canonical',
        'offer': 'UbuntuServer',
        'sku': '16.04-LTS',
        'version': 'latest',
    },
    boot_diagnostics={
        'enabled': True,
        'storage_uri': sa.primary_blob_endpoint,
    }
)

# Note - due to a bug in the terraform-provider-azurerm, the public IP address is not yet populated corerctly.
pulumi.output('public_ip_address', public_ip.ip_address)
pulumi.output('private_ip_address', nic.private_ip_address)
