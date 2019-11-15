from pulumi import export, ResourceOptions
from pulumi_gcp import compute
from config import project, owner, subnet_cidr_blocks, nginx_install_script
import instance
import network

base_metadata = {
    "Project": project,
    "Owner": owner,
}

network = network.Vpc(project,
                      network.VpcArgs(
                          subnet_cidr_blocks=subnet_cidr_blocks,
                      ))

nginx_instance = instance.Server(project,
                                 instance.ServerArgs(
                                     machine_type="f1-micro",
                                     service_name="nginx",
                                     metadata_startup_script=nginx_install_script,
                                     ports=["80"],
                                     subnet=network.subnets[0],
                                     metadata=base_metadata,
                                 ))

export('network', network.network.name)
export('public_ip',
       nginx_instance.instance.network_interfaces[0]["accessConfigs"][0]["natIp"])
