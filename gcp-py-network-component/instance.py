from pulumi import ComponentResource, ResourceOptions
from pulumi_gcp import compute


class ServerArgs:

    def __init__(self,
                 machine_type="f1-micro",
                 service_name=None,
                 metadata_startup_script=None,
                 ports=None,
                 subnet=None,
                 metadata=None,
                 ):
        self.machine_type = machine_type
        self.service_name = service_name
        self.metadata_startup_script = metadata_startup_script
        self.ports = ports
        self.subnet = subnet
        self.metadata = metadata if metadata is not None else {}


class Server(ComponentResource):

    def __init__(self,
                 name: str,
                 args: ServerArgs,
                 opts: ResourceOptions = None):

        super().__init__("my:modules:Server", name, {}, opts)

        firewall = compute.Firewall(name,
                                    network=args.subnet.network,
                                    allows=[compute.FirewallAllowArgs(
                                        protocol="tcp",
                                        ports=args.ports,
                                    )],
                                    target_tags=[args.service_name],
                                    opts=ResourceOptions(parent=self)
                                    )

        addr = compute.address.Address(name,
                                       opts=ResourceOptions(parent=self)
                                       )

        self.instance = compute.Instance(name,
                                         machine_type=args.machine_type,
                                         boot_disk=compute.InstanceBootDiskArgs(
                                             initialize_params=compute.InstanceBootDiskInitializeParamsArgs(
                                                 image="ubuntu-os-cloud/ubuntu-1804-lts"
                                             )
                                         ),
                                         network_interfaces=[compute.InstanceNetworkInterfaceArgs(
                                             subnetwork=args.subnet.self_link,
                                             access_configs=[compute.InstanceNetworkInterfaceAccessConfigArgs(
                                                 nat_ip=addr.address
                                             )]
                                         )],
                                         tags=[args.service_name],
                                         metadata=args.metadata,
                                         metadata_startup_script=args.metadata_startup_script,
                                         opts=ResourceOptions(parent=self)
                                         )

        self.register_outputs({})
