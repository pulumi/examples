from pulumi import Config, export, asset, Output, ComponentResource, ResourceOptions
from pulumi_azure import core, compute, network


class WebServerArgs:
    def __init__(
        self,
        resource_group: core.ResourceGroup,
        subnet: network.Subnet,
        username: str,
        password: str,
    ):
        self.resource_group = resource_group
        self.subnet = subnet
        self.username = username
        self.password = password


class WebServer(ComponentResource):
    def __init__(self, name: str, args: WebServerArgs, opts: ResourceOptions = None):
        super().__init__("custom:app:WebServer", name, {}, opts)

        child_opts = ResourceOptions(parent=self)

        public_ip = network.PublicIp(
            "server-ip",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            allocation_method="Dynamic",
            opts=child_opts,
        )

        network_iface = network.NetworkInterface(
            "server-nic",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            ip_configurations=[
                {
                    "name": "webserveripcfg",
                    "subnet_id": args.subnet.id,
                    "private_ip_address_allocation": "Dynamic",
                    "public_ip_address_id": public_ip.id,
                }
            ],
            opts=child_opts,
        )

        userdata = """#!/bin/bash
        echo "Hello, World!" > index.html
        nohup python -m SimpleHTTPServer 80 &"""

        vm = compute.VirtualMachine(
            "server-vm",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            network_interface_ids=[network_iface.id],
            vm_size="Standard_A0",
            delete_data_disks_on_termination=True,
            delete_os_disk_on_termination=True,
            os_profile={
                "computer_name": "hostname",
                "admin_username": args.username,
                "admin_password": args.password,
                "custom_data": userdata,
            },
            os_profile_linux_config={"disable_password_authentication": False},
            storage_os_disk={"create_option": "FromImage", "name": "myosdisk1"},
            storage_image_reference={
                "publisher": "canonical",
                "offer": "UbuntuServer",
                "sku": "16.04-LTS",
                "version": "latest",
            },
            opts=child_opts,
        )

        # The public IP address is not allocated until the VM is running, so we wait
        # for that resource to create, and then lookup the IP address again to report
        # its public IP.
        combined_output = Output.all(
            vm.id, public_ip.name, public_ip.resource_group_name
        )
        self.public_ip_addr = combined_output.apply(
            lambda lst: network.get_public_ip(name=lst[1], resource_group_name=lst[2]).ip_address
        )
        self.register_outputs({})
