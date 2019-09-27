import pulumi_digitalocean as do
from pulumi import export

droplet_count = 3
region = "nyc3"

user_data = """#!/bin/bash
  sudo apt-get update
  sudo apt-get install -y nginx
"""

droplet_type_tag = do.Tag("demo-app")


for x in range(0, droplet_count):
    instance_name = "web-%s" %x
    name_tag = do.Tag(instance_name)
    droplet = do.Droplet(
        instance_name,
        image="ubuntu-18-04-x64",
        region=region,
        size="512mb",
        tags=[name_tag.id, droplet_type_tag.id],
        user_data=user_data
    )

loadbalancer = do.LoadBalancer(
    "public",
    droplet_tag=droplet_type_tag.name,
    forwarding_rules=[{
        "entry_port": 80,
        "entry_protocol": "http",
        "target_port": 80,
        "target_protocol": "http",
    }],
    healthcheck={
        "port": 80,
        "protocol": "tcp",
    },
    region=region,
)

export("endpoint", loadbalancer.ip)
