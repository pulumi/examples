# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
# 
# There are two main parts to this project:
# - Standing up a KVM host
# - Using that KVM host to create a VM (aka Domain) and related storage resources.
#
# The KVM host is created via a component resource.
# Any KVM host can be used as long as the connection URI is returned to the main so that
# the libvirt provider can be instantiated.
#
# In this case, the KVM host component creates a VM in Azure and uses an ssh connection URI.
#

import pulumi as pulumi
from pulumi import Config, Output, ResourceOptions, export
import pulumi_libvirt as libvirt
import libvirt_host

# Get some stack-related config data
stackname = pulumi.get_stack()
config = Config()
basename = config.get("basename") or "libvirt-ex"
basename = f"{basename}-{stackname}"

### Create a KVM host
libvirt_server = libvirt_host.Server(basename)

### Use the KVM host 
# Create a provider using the connection URI returned by the KVM host component
libvirt_provider = libvirt.Provider(f"{basename}-libvirt",
    uri=libvirt_server.libvirt_remote_uri
)

# Create a storage pool for the KVM VM that is going to be launched.
vm_pool = libvirt.Pool(f"{basename}-vm_pool",
    args=libvirt.PoolArgs(type="dir", path=libvirt_server.vm_pool_dir), 
    opts=ResourceOptions(provider=libvirt_provider)
)
export("libvirt pool name", vm_pool.name)

# Create a small linux volume that contains a tiny (and thus fast to download) linux.
vm_vol = libvirt.Volume(f"{basename}-linux",
    pool=vm_pool.name,
    source="http://download.cirros-cloud.net/0.5.2/cirros-0.5.2-x86_64-disk.img",
    format="qcow2",
    opts=ResourceOptions(provider=libvirt_provider)
)
export("libvirt volume name", vm_vol.name)

# Create a VM using the volume created above.
vm = libvirt.Domain(f"{basename}-vm",
    memory=512,
    vcpu=1,
    disks=[libvirt.DomainDiskArgs(
        volume_id=vm_vol.id
    )],
    network_interfaces=[libvirt.DomainNetworkInterfaceArgs(
        network_name="default",
        wait_for_lease=True,
    )],
    opts=ResourceOptions(provider=libvirt_provider)
)
export("libvirt VM name", vm.name)

# Export a command that can be used to see that there is indeed a VM running under KVM on the KVM host.
test_cmd = Output.concat('echo virsh list | ssh -i ', libvirt_server.ssh_priv_key_file, ' ',libvirt_server.username,'@',libvirt_server.ip)
export("Check the libvirt VM on the KVM host", test_cmd)
