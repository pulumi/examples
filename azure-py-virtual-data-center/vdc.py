from pulumi import ResourceOptions
from pulumi.resource import CustomTimeouts
from pulumi_azure import core, network, compute

# Variables that may need to be injected before calling functions:
# vdc.location = props.location
# vdc.resource_group_name = props.resource_group_name
# vdc.s = props.separator
# vdc.self = self
# vdc.suffix = props.suffix
# vdc.tags = props.tags

def bastion_host(stem, virtual_network_name, address_prefix, depends_on=None):
    ab_sn = network.Subnet(f'{stem}{s}ab{s}sn',
        name = 'AzureBastionSubnet', # name required
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefixes = [address_prefix],
        opts = ResourceOptions(
            parent = self,
            delete_before_replace = True,
            depends_on = depends_on,
        ),
    )
    ab_pip = network.PublicIp(f'{stem}{s}ab{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = 'Standard',
        allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    ab = compute.BastionHost(f'{stem}{s}ab{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        ip_configuration = compute.BastionHostIpConfigurationArgs(
            name = f'{stem}{s}ab{s}ipc',
            public_ip_address_id = ab_pip.id,
            subnet_id = ab_sn.id,
        ),
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return ab

def expressroute_gateway(stem, subnet_id, depends_on=None):
    er_gw_pip = network.PublicIp(f'{stem}{s}er{s}gw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    er_gw = network.VirtualNetworkGateway(f'{stem}{s}er{s}gw{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = 'Standard',
        type = 'ExpressRoute',
        vpn_type = 'RouteBased',
        ip_configurations = [network.VirtualNetworkGatewayIpConfigurationArgs(
            name = f'{stem}{s}er{s}gw{s}ipc',
            public_ip_address_id = er_gw_pip.id,
            subnet_id = subnet_id,
        )],
        tags = tags,
        opts = ResourceOptions(
            parent = self,
            depends_on = depends_on,
            custom_timeouts = CustomTimeouts(
                create = '1h',
                update = '1h',
                delete = '1h',
            ),
        ),
    )
    return er_gw

def firewall(stem, fw_sn_id, fwm_sn_id, private_ranges, depends_on=None):
    fw_pip = network.PublicIp(f'{stem}{s}fw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = 'Standard',
        allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    fwm_pip = network.PublicIp(f'{stem}{s}fwm{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = 'Standard',
        allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    fw = network.Firewall(f'{stem}{s}fw{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
#        additional_properties = {
#            "Network.SNAT.PrivateRanges": private_ranges,
#        },
#        sku = 'AZFW_VNet',
        ip_configurations = [network.FirewallIpConfigurationArgs(
            name = f'{stem}{s}fw{s}ipc',
            public_ip_address_id = fw_pip.id,
            subnet_id = fw_sn_id,
        )],
        management_ip_configuration = network.FirewallIpConfigurationArgs(
            name = f'{stem}{s}fwm{s}ipc',
            public_ip_address_id = fwm_pip.id,
            subnet_id = fwm_sn_id,
        ),
        tags = tags,
        opts = ResourceOptions(
            parent = self,
            depends_on = depends_on,
            custom_timeouts = CustomTimeouts(
                create = '1h',
                update = '1h',
                delete = '1h',
            ),
        ),
    )
    return fw

def resource_group(stem):
    rg = core.ResourceGroup(f'{stem}{s}vdc{s}rg{s}{suffix}',
        location = location,
        tags = tags,
    )
    return rg.name

def route_table(stem, disable_bgp_route_propagation=None, depends_on=None):
    rt = network.RouteTable(f'{stem}{s}rt{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        disable_bgp_route_propagation = disable_bgp_route_propagation,
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return rt

def route_to_internet(stem, route_table_name):
    r_i = network.Route(f'{stem}{s}r',
        name = 'FirewallDefaultRoute', # name required
        resource_group_name = resource_group_name,
        address_prefix = '0.0.0.0/0',
        next_hop_type = 'Internet',
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self, delete_before_replace=True),
    )
    return r_i

def route_to_virtual_appliance(
        stem,
        route_table_name,
        address_prefix,
        next_hop_ip_address,
    ):
    r_va = network.Route(f'{stem}{s}r',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        next_hop_type = 'VirtualAppliance',
        next_hop_in_ip_address = next_hop_ip_address,
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self),
    )
    return r_va

def route_to_virtual_network(stem, route_table_name, address_prefix):
    r_vn = network.Route(f'{stem}{s}r',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        next_hop_type = 'VnetLocal',
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self),
    )
    return r_vn

def subnet(
        stem,
        virtual_network_name,
        address_prefix,
        route_table_id,
        depends_on = None,
    ):
    sn = network.Subnet(f'{stem}{s}sn',
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefixes = [address_prefix],
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    rta = network.SubnetRouteTableAssociation(f'{stem}{s}sn{s}rta',
        route_table_id = route_table_id,
        subnet_id = sn.id,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return sn

def subnet_special(
        stem,
        name,
        virtual_network_name,
        address_prefix,
        route_table_id,
        depends_on = None,
    ):
    sn = network.Subnet(f'{stem}{s}sn',
        name = name,
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefixes = [address_prefix],
        opts = ResourceOptions(
            parent = self,
            delete_before_replace = True,
            depends_on = depends_on,
        ),
    )
    rta = network.SubnetRouteTableAssociation(f'{stem}{s}sn{s}rta',
        route_table_id = route_table_id,
        subnet_id = sn.id,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return sn

def virtual_network(stem, address_spaces):
    vn = network.VirtualNetwork(f'{stem}{s}vn{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        address_spaces = address_spaces,
        tags = tags,
        opts = ResourceOptions(parent=self),
    )
    return vn

def vnet_peering(
        stem,
        virtual_network_name,
        peer,
        remote_virtual_network_id,
        allow_forwarded_traffic = None,
        allow_gateway_transit = None,
        use_remote_gateways = None,
        depends_on = None,
    ):
        vnp = network.VirtualNetworkPeering(f'{stem}{s}{peer}{s}vnp{s}{suffix}',
            resource_group_name = resource_group_name,
            virtual_network_name = virtual_network_name,
            remote_virtual_network_id = remote_virtual_network_id,
            allow_forwarded_traffic = allow_forwarded_traffic,
            allow_gateway_transit = allow_gateway_transit,
            use_remote_gateways = use_remote_gateways,
            allow_virtual_network_access = True,
            opts = ResourceOptions(parent=self, depends_on=depends_on),
        )
        return vnp

def vpn_gateway(stem, subnet_id, depends_on=None):
    vpn_gw_pip = network.PublicIp(f'{stem}{s}vpn{s}gw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    vpn_gw = network.VirtualNetworkGateway(f'{stem}{s}vpn{s}gw{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = 'VpnGw1',
        type = 'Vpn',
        vpn_type = 'RouteBased',
        enable_bgp = True,
        ip_configurations = [network.VirtualNetworkGatewayIpConfigurationArgs(
            name = f'{stem}{s}vpn{s}gw{s}ipc',
            public_ip_address_id = vpn_gw_pip.id,
            subnet_id = subnet_id,
        )],
        tags = tags,
        opts = ResourceOptions(
            parent = self,
            depends_on = depends_on,
            custom_timeouts = CustomTimeouts(
                create = '1h',
                update = '1h',
                delete = '1h',
            ),
        ),
    )
    return vpn_gw

if __name__ == "__main__":
    print(dir())
