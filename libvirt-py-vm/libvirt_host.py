# Builds a KVM host in Azure using an instance type that supports nested virtualization.
# It uses SSH remote connection URI.
# See the following for more details: https://libvirt.org/uri.html#URI_remote

import pulumi as pulumi
from pulumi import ComponentResource, ResourceOptions
from pulumi import Config, Output, ResourceOptions, export
import pulumi_azure_native.compute as compute
import pulumi_azure_native.network as network
import pulumi_azure_native.resources as resources
import pulumi_tls as tls
import os as os
import time as time
import base64


class Server(ComponentResource):

    def __init__(self,
                 name: str,
                 opts: ResourceOptions = None):

        super().__init__('custom:resource:LibvirtHost', name, {}, opts)

        basename = f"{name}-kvm"
        username = "kvmuser"
        computername = "kvmhost"

        # Resource group, etc for the KVM host
        resource_group = resources.ResourceGroup(f"{basename}-rg", opts=ResourceOptions(parent=self))

        net = network.VirtualNetwork(
            f"{basename}-net",
            resource_group_name=resource_group.name,
            address_space=network.AddressSpaceArgs(
                address_prefixes=["10.0.0.0/16"],
            ),
            subnets=[network.SubnetArgs(
                name="default",
                address_prefix="10.0.1.0/24",
            )],
            opts=ResourceOptions(parent=self))

        public_ip = network.PublicIPAddress(
            f"{basename}-ip",
            resource_group_name=resource_group.name,
            public_ip_allocation_method=network.IPAllocationMethod.DYNAMIC,
            opts=ResourceOptions(parent=self))

        network_iface = network.NetworkInterface(
            f"{basename}-nic",
            resource_group_name=resource_group.name,
            ip_configurations=[network.NetworkInterfaceIPConfigurationArgs(
                name="serveripcfg",
                subnet=network.SubnetArgs(id=net.subnets[0].id),
                private_ip_allocation_method=network.IPAllocationMethod.DYNAMIC,
                public_ip_address=network.PublicIPAddressArgs(id=public_ip.id),
            )],
            opts=ResourceOptions(parent=self))

        # SSH key for accessing the Azure VM that is going to be the KVM host.
        ssh_key = tls.PrivateKey(f"{basename}-sshkey", algorithm="RSA", rsa_bits=4096, opts=ResourceOptions(parent=self))

        # Script to configure the kvm service on the kvm host
        init_script = f"""#!/bin/bash

        # Install KVM
        sudo apt update
        sudo apt-get -y install qemu-kvm libvirt-bin
        # hack to account for this bug: https://bugs.launchpad.net/ubuntu/+source/libvirt/+bug/1677398
        # Work around: https://bugs.launchpad.net/ubuntu/+source/libvirt/+bug/1677398/comments/42
        sudo sed -i '$ a security_driver = "none"' /etc/libvirt/qemu.conf
        sudo systemctl restart libvirt-bin

        """

        vm = compute.VirtualMachine(
            f"{basename}-vm",
            resource_group_name=resource_group.name,
            network_profile=compute.NetworkProfileArgs(
                network_interfaces=[
                    compute.NetworkInterfaceReferenceArgs(id=network_iface.id),
                ],
            ),
            hardware_profile=compute.HardwareProfileArgs(
                vm_size=compute.VirtualMachineSizeTypes.STANDARD_D4S_V3
            ),
            os_profile=compute.OSProfileArgs(
                computer_name=computername,
                admin_username=username,
                custom_data=base64.b64encode(init_script.encode("ascii")).decode("ascii"),
                linux_configuration=compute.LinuxConfigurationArgs(
                    ssh=compute.SshConfigurationArgs(
                        public_keys=[compute.SshPublicKeyArgs(
                            key_data=ssh_key.public_key_openssh,
                            path=f"/home/{username}/.ssh/authorized_keys"
                        )]
                    )
                )
            ),
            storage_profile=compute.StorageProfileArgs(
                os_disk=compute.OSDiskArgs(
                    create_option=compute.DiskCreateOptionTypes.FROM_IMAGE,
                ),
                image_reference=compute.ImageReferenceArgs(
                    publisher="canonical",
                    offer="UbuntuServer",
                    sku="18.04-LTS",
                    version="latest",
                ),
            ),
            opts=ResourceOptions(parent=self))

        # There's some delay between when Azure says the VM is ready and
        # when the KVM/qemu service can start accepting connections.
        # So, wait a bit to allow the KVM server to become fully ready.
        # But only do the wait if the VM has been provisioned (i.e. not during a preview).
        vm.provisioning_state.apply(lambda state: time.sleep(90))

        public_ip_addr = vm.id.apply(lambda _: network.get_public_ip_address_output(
                public_ip_address_name=public_ip.name,
                resource_group_name=resource_group.name))

        # Create/update the private key file for the SSH remote connection URI.
        def write_key_file(priv_key, key_file):
            if (os.path.exists(key_file)):
                os.chmod(key_file, 0o666)
            f = open(key_file, "w")
            f.write(priv_key)
            f.close()
            os.chmod(key_file, 0o400)
        key_file=f"{basename}_server.priv"
        ssh_key.private_key_pem.apply(lambda priv_key: write_key_file(priv_key, key_file))

        # Build the connection URI that is returned for use by the libvirt provider.
        # See https://libvirt.org/uri.html#URI_remote for details on the remote URI options
        self.libvirt_remote_uri = Output.concat("qemu+ssh://",username,"@",public_ip_addr.ip_address,"/system?keyfile=./",key_file,"&socket=/var/run/libvirt/libvirt-sock&no_verify=1")

        # Return where the VM pool should be created.
        # In this case, the "vm pool" is simply placed under the KVM host user's home folder
        self.vm_pool_dir = f"/home/{username}/vms"

        # Other values for convenience to output useful information
        self.ip = public_ip_addr.ip_address
        self.username = username
        self.ssh_priv_key_file = key_file

        self.register_outputs({})
