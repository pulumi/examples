from pulumi import export
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

nginx_service_name = "nginx"
nginx_instance = instance.Server(f"{project}-{nginx_service_name}",
                                 instance.ServerArgs(
                                     service_name=nginx_service_name,
                                     metadata_startup_script=nginx_install_script,
                                     ports=["80"],
                                     subnet=network.subnets[0],
                                     metadata=base_metadata,
                                 ))

export('network', network.network.name)
export('nginx_public_ip',
       nginx_instance.instance.network_interfaces.apply(lambda ni: ni[0].access_configs[0].nat_ip))
