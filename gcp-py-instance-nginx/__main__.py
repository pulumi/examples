import pulumi
from pulumi_gcp import compute

script = "#!/bin/bash\nsudo touch /tmp/a.txt\nsudo yum install -y nginx\nsudo service nginx start"

addr = compute.address.Address("poc")

network = compute.Network("poc")

firewall = compute.Firewall(
    "poc",
    network=network.self_link,
    allows=[
        {
            "protocol": "tcp",
            "ports": ["22"]
        },
        {
            "protocol": "tcp",
            "ports": ["80"]
        }
    ]
)

instance = compute.Instance(
    "poc",
    name="poc",
    machine_type="f1-micro",
    boot_disk={
        "initializeParams": {
            "image": "centos-cloud/centos-7-v20190116"
        }
    },
    network_interfaces=[
        {
            "network": network.id,
            "accessConfigs": [{
                "nat_ip": addr.address
            }]
        }
    ],
    metadata_startup_script=script,
)

# Export the DNS name of the bucket
pulumi.export("instance_name", instance.name)
pulumi.export("instance_network", instance.network_interfaces)
pulumi.export("external_ip", addr.address)
