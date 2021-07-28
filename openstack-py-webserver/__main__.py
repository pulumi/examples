"""An OpenStack Python Pulumi program"""

import pulumi
import pulumi_openstack as openstack


fedora_image = openstack.images.Image(
    "fedora",
    name="fedora",
    container_format="bare",
    disk_format="qcow2",
    image_source_url="https://ftp.plusline.net/fedora/linux/releases/34/Cloud/x86_64/images/Fedora-Cloud-Base-34-1.2.x86_64.qcow2",
    visibility="public",
)

default_keypair = openstack.compute.keypair.Keypair(
    "default",
    name="default",
    public_key="ssh-ed25519 <public key>",
)

secgroup_default = openstack.networking.get_sec_group(name="default")

secgroup_rule_ssh = openstack.networking.SecGroupRule(
    "secgroupRule1",
    direction="ingress",
    ethertype="IPv4",
    port_range_max=22,
    port_range_min=22,
    protocol="tcp",
    remote_ip_prefix="0.0.0.0/0",
    description="Allow ssh",
    security_group_id=secgroup_default.id,
)

secgroup_rule_python_server = openstack.networking.SecGroupRule(
    "secgroupRule2",
    direction="ingress",
    ethertype="IPv4",
    port_range_max=8000,
    port_range_min=8000,
    protocol="tcp",
    remote_ip_prefix="0.0.0.0/0",
    description="Allow python http server",
    security_group_id=secgroup_default.id,
)

secgroup_rule_icmp = openstack.networking.SecGroupRule(
    "secgroupRule3",
    direction="ingress",
    ethertype="IPv4",
    protocol="icmp",
    remote_ip_prefix="0.0.0.0/0",
    description="Allow ping",
    security_group_id=secgroup_default.id,
)

network_public = openstack.networking.get_network(name="public")

user_data = """
#!/bin/bash
echo "Hello, World!" > index.html
nohup python3 -m http.server &
"""

fedora = openstack.compute.Instance(
    "test_fedora",
    name="test_fedora",
    flavor_name="m1.small",
    image_id=fedora_image.id,
    key_pair=default_keypair.id,
    security_groups=["default"],
    networks=[
        openstack.compute.InstanceNetworkArgs(uuid=network_public.id),
    ],
    user_data=user_data,
)

# Export the IP of the instance
pulumi.export("instance_ip", fedora.access_ip_v4)
