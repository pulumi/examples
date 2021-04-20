from pulumi import Config, export, ResourceOptions
from pulumi_azure import core, network, lb, compute
import pulumi_random as random

config = Config()
admin_user = config.get("adminUser") or "azureuser"
admin_password = config.get_secret("adminPassword") or random.RandomPassword(
    "pwd",
    length=20,
    special=True).result
domain = config.get("domain") or random.RandomString(
    "domain",
    length=10,
    number=False,
    special=False,
    upper=False).result
application_port = config.get_float("applicationPort") or 80

resource_group = core.ResourceGroup("vmss-rg")

public_ip = network.PublicIp(
    "public-ip",
    resource_group_name=resource_group.name,
    allocation_method="Static",
    domain_name_label=domain)

load_balancer = lb.LoadBalancer(
    "lb",
    resource_group_name=resource_group.name,
    frontend_ip_configurations=[lb.LoadBalancerFrontendIpConfigurationArgs(
        name="PublicIPAddress",
        public_ip_address_id=public_ip.id,
    )])

bpepool = lb.BackendAddressPool(
    "bpepool",
    resource_group_name=resource_group.name,
    loadbalancer_id=load_balancer.id)

ssh_probe = lb.Probe(
    "ssh-probe",
    resource_group_name=resource_group.name,
    loadbalancer_id=load_balancer.id,
    port=application_port)

nat_ule = lb.Rule(
    "lbnatrule-http",
    resource_group_name=resource_group.name,
    backend_address_pool_id=bpepool.id,
    backend_port=application_port,
    frontend_ip_configuration_name="PublicIPAddress",
    frontend_port=application_port,
    loadbalancer_id=load_balancer.id,
    probe_id=ssh_probe.id,
    protocol="Tcp")

vnet = network.VirtualNetwork(
    "vnet",
    resource_group_name=resource_group.name,
    address_spaces=["10.0.0.0/16"])

subnet = network.Subnet(
    "subnet",
    resource_group_name=resource_group.name,
    address_prefixes=["10.0.2.0/24"],
    virtual_network_name=vnet.name,
    enforce_private_link_endpoint_network_policies=False)

scale_set = compute.ScaleSet(
    "vmscaleset",
    resource_group_name=resource_group.name,
    network_profiles=[compute.ScaleSetNetworkProfileArgs(
        ip_configurations=[compute.ScaleSetNetworkProfileIpConfigurationArgs(
            load_balancer_backend_address_pool_ids=[bpepool.id],
            name="IPConfiguration",
            primary=True,
            subnet_id=subnet.id,
        )],
        name="networkprofile",
        primary=True,
    )],
    os_profile=compute.ScaleSetOsProfileArgs(
        admin_username=admin_user,
        admin_password=admin_password,
        computer_name_prefix="vmlab",
        custom_data="""
        #cloud-config
        packages:
            - nginx
        """,
    ),
    os_profile_linux_config=compute.ScaleSetOsProfileLinuxConfigArgs(
        disable_password_authentication=False,
    ),
    sku=compute.ScaleSetSkuArgs(
        capacity=1,
        name="Standard_DS1_v2",
        tier="Standard",
    ),
    storage_profile_data_disks=[compute.ScaleSetStorageProfileDataDiskArgs(
        caching="ReadWrite",
        create_option="Empty",
        disk_size_gb=10,
        lun=0,
    )],
    storage_profile_image_reference=compute.ScaleSetStorageProfileImageReferenceArgs(
        offer="UbuntuServer",
        publisher="Canonical",
        sku="16.04-LTS",
        version="latest",
    ),
    storage_profile_os_disk=compute.ScaleSetStorageProfileOsDiskArgs(
        caching="ReadWrite",
        create_option="FromImage",
        managed_disk_type="Standard_LRS",
        name="",
    ),
    upgrade_policy_mode="Manual",
    opts=ResourceOptions(depends_on=[bpepool]))

export("public_address", public_ip.fqdn)

