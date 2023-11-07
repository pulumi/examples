import pulumi_digitalocean as do
from pulumi import export, get_stack

droplet_count = 2
region = "nyc3"

user_data = """#!/bin/bash
  sudo apt-get update
  sudo apt-get install -y nginx
"""

droplet_type = "demo-app-%s" %get_stack()
droplet_type_tag = do.Tag(droplet_type)

for x in range(0, droplet_count):
    instance_name = "web-%s" %x
    name_tag = do.Tag(instance_name)
    droplet = do.Droplet(
        instance_name,
        image="ubuntu-20-04-x64",
        region=region,
        size="s-1vcpu-1gb",
        tags=[name_tag.id, droplet_type_tag.id],
        user_data=user_data
    )

loadbalancer = do.LoadBalancer(
    "public",
    droplet_tag=droplet_type_tag.name,
    forwarding_rules=[do.LoadBalancerForwardingRuleArgs(
        entry_port=80,
        entry_protocol="http",
        target_port=80,
        target_protocol="http",
    )],
    healthcheck=do.LoadBalancerHealthcheckArgs(
        port=80,
        protocol="tcp",
    ),
    region=region,
)

export("endpoint", loadbalancer.ip)
