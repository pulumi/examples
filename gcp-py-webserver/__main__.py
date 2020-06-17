import pulumi
from pulumi import ResourceOptions
from pulumi_gcp import compute

compute_network = compute.Network(
    "network", 
    auto_create_subnetworks=True,
)

compute_firewall = compute.Firewall(
    "firewall", 
    network=compute_network.self_link,
    allows=[{
        "protocol": "tcp",
        "ports": [ "22", "80" ],
    }] 
)

# A simple bash script that will run when the webserver is initalized
startup_script = """#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &"""

instance_addr = compute.address.Address("address")
compute_instance = compute.Instance(
    "instance", 
    machine_type="f1-micro",
    metadata_startup_script=startup_script,
    boot_disk={
        "initializeParams": {
            "image": "debian-cloud/debian-9-stretch-v20181210"
        }
    },
    network_interfaces=[{
            "network": compute_network.id,
            "accessConfigs": [{
                "natIp": instance_addr.address
            }],
    }],
    service_account={
        "scopes": ["https://www.googleapis.com/auth/cloud-platform"],
    },
    opts=ResourceOptions(depends_on=[compute_firewall]),
)

pulumi.export("instanceName", compute_instance.name)
pulumi.export("instanceIP", instance_addr.address)