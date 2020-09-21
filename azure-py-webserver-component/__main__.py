import pulumi
from pulumi import Config, ResourceOptions
from pulumi_azure import core, network
from webserver import WebServerArgs, WebServer

config = Config()
username = config.require_secret("username")
password = config.require_secret("password")

resource_group = core.ResourceGroup("server", location="West US")

net = network.VirtualNetwork(
    "server-network",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    address_spaces=["10.0.0.0/16"],
    subnets=[network.VirtualNetworkSubnetArgs(name="default", address_prefix="10.0.1.0/24")],
    opts=ResourceOptions(parent=resource_group),
)

subnet = network.Subnet(
    "server-subnet",
    resource_group_name=resource_group.name,
    virtual_network_name=net.name,
    address_prefixes=["10.0.2.0/24"],
    opts=ResourceOptions(parent=net),
)

web_server = WebServer(
    "server",
    WebServerArgs(
        resource_group=resource_group,
        subnet=subnet,
        username=username,
        password=password,
    ),
)

pulumi.export("public_ip", web_server.public_ip_addr)
