from pulumi import Config, export, ResourceOptions
from pulumi_azure import core, network, lb, compute
import pulumi_random as random
import base64

config = Config()
admin_user = config.get("adminUser") or "azureuser"
admin_password = (
    config.get_secret("adminPassword")
    or random.RandomPassword("pwd", length=20, special=True).result
)
domain = (
    config.get("domain")
    or random.RandomString(
        "domain", length=10, number=False, special=False, upper=False
    ).result
)
application_port = config.get_float("applicationPort") or 80

resource_group = core.ResourceGroup("vmss-rg")

public_ip = network.PublicIp(
    "public-ip",
    resource_group_name=resource_group.name,
    allocation_method="Static",
    domain_name_label=domain,
)

load_balancer = lb.LoadBalancer(
    "lb",
    resource_group_name=resource_group.name,
    frontend_ip_configurations=[
        lb.LoadBalancerFrontendIpConfigurationArgs(
            name="PublicIPAddress",
            public_ip_address_id=public_ip.id,
        )
    ],
)

bpepool = lb.BackendAddressPool("bpepool", loadbalancer_id=load_balancer.id)

ssh_probe = lb.Probe(
    "ssh-probe", loadbalancer_id=load_balancer.id, port=application_port
)

nat_ule = lb.Rule(
    "lbnatrule-http",
    backend_address_pool_ids=[bpepool.id],
    backend_port=application_port,
    frontend_ip_configuration_name="PublicIPAddress",
    frontend_port=application_port,
    loadbalancer_id=load_balancer.id,
    probe_id=ssh_probe.id,
    protocol="Tcp",
)

vnet = network.VirtualNetwork(
    "vnet", resource_group_name=resource_group.name, address_spaces=["10.0.0.0/16"]
)

subnet = network.Subnet(
    "subnet",
    resource_group_name=resource_group.name,
    address_prefixes=["10.0.2.0/24"],
    virtual_network_name=vnet.name,
    private_link_service_network_policies_enabled=False,
)

scale_set = compute.LinuxVirtualMachineScaleSet(
    "vmscaleset",
    resource_group_name=resource_group.name,
    network_interfaces=[
        compute.LinuxVirtualMachineScaleSetNetworkInterfaceArgs(
            ip_configurations=[
                compute.LinuxVirtualMachineScaleSetNetworkInterfaceIpConfigurationArgs(
                    load_balancer_backend_address_pool_ids=[bpepool.id],
                    name="IPConfiguration",
                    primary=True,
                    subnet_id=subnet.id,
                )
            ],
            name="networkprofile",
            primary=True,
        )
    ],
    admin_username=admin_user,
    admin_password=admin_password,
    computer_name_prefix="vmlab",
    custom_data=base64.b64encode(
        bytes(
            """
    #cloud-config
    packages:
        - nginx
    """,
            "utf-8",
        )
    ).decode("utf-8"),
    disable_password_authentication=False,
    sku="Standard_DS1_v2",
    data_disks=[
        compute.LinuxVirtualMachineScaleSetDataDiskArgs(
            storage_account_type="Standard_LRS",
            caching="ReadWrite",
            create_option="Empty",
            disk_size_gb=10,
            lun=0,
        )
    ],
    source_image_reference=compute.LinuxVirtualMachineScaleSetSourceImageReferenceArgs(
        offer="UbuntuServer",
        publisher="Canonical",
        sku="16.04-LTS",
        version="latest",
    ),
    os_disk=compute.LinuxVirtualMachineScaleSetOsDiskArgs(
        caching="ReadWrite",
        storage_account_type="Standard_LRS",
    ),
    upgrade_mode="Manual",
    opts=ResourceOptions(depends_on=[bpepool]),
)

export("public_address", public_ip.fqdn)
