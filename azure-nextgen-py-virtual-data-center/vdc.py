from pulumi import ResourceOptions
from pulumi.resource import CustomTimeouts
from pulumi_azure_nextgen.resources import latest as resources
from pulumi_azure_nextgen.network import latest as network

# Variables that may need to be injected before calling functions:
# vdc.location = props.location
# vdc.resource_group_name = props.resource_group_name
# vdc.s = props.separator
# vdc.self = self
# vdc.suffix = props.suffix
# vdc.tags = props.tags

def bastion_host(stem, virtual_network_name, address_prefix, depends_on=None):
    ab_sn = network.Subnet(f'{stem}{s}ab{s}sn',
        subnet_name = 'AzureBastionSubnet', # name required
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefix = address_prefix,
        opts = ResourceOptions(
            parent = self,
            delete_before_replace = True,
            depends_on = depends_on,
        ),
    )
    ab_pip = network.PublicIPAddress(f'{stem}{s}ab{s}pip{s}{suffix}',
        public_ip_address_name = f'{stem}{s}ab{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = network.PublicIPAddressSkuArgs(
            name = 'Standard',
        ),
        public_ip_allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    ab = network.BastionHost(f'{stem}{s}ab{s}{suffix}',
        bastion_host_name = f'{stem}{s}ab{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        ip_configurations = [network.BastionHostIPConfigurationArgs(
            name = f'{stem}{s}ab{s}ipc',
            public_ip_address = network.PublicIPAddressArgs(
                id = ab_pip.id,
            ),
            subnet = network.SubnetArgs(
                id = ab_sn.id,
            ),
        )],
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return ab

def expressroute_gateway(stem, subnet_id, depends_on=None):
    er_gw_pip = network.PublicIPAddress(f'{stem}{s}er{s}gw{s}pip{s}{suffix}',
        public_ip_address_name = f'{stem}{s}er{s}gw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        public_ip_allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    er_gw = network.VirtualNetworkGateway(f'{stem}{s}er{s}gw{s}{suffix}',
        virtual_network_gateway_name = f'{stem}{s}er{s}gw{s}{suffix}',    
        resource_group_name = resource_group_name,
        location = location,
        sku = network.VirtualNetworkGatewaySkuArgs(
            name = 'Standard',
            tier = 'Standard',
        ),
        gateway_type = 'ExpressRoute',
        vpn_type = 'RouteBased',
        enable_bgp = True,
        ip_configurations = [network.VirtualNetworkGatewayIPConfigurationArgs(
            name = f'{stem}{s}er{s}gw{s}ipc',
            public_ip_address = network.PublicIPAddressArgs(
                id = er_gw_pip.id,
            ),
            subnet = network.SubnetArgs(
                id = subnet_id,
            ),
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
    fw_pip = network.PublicIPAddress(f'{stem}{s}fw{s}pip{s}{suffix}',
        public_ip_address_name = f'{stem}{s}fw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = network.PublicIPAddressSkuArgs(
            name = 'Standard',
        ),
        public_ip_allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    fwm_pip = network.PublicIPAddress(f'{stem}{s}fwm{s}pip{s}{suffix}',
        public_ip_address_name = f'{stem}{s}fwm{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = network.PublicIPAddressSkuArgs(
            name = 'Standard',
        ),
        public_ip_allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    fw = network.AzureFirewall(f'{stem}{s}fw{s}{suffix}',
        azure_firewall_name = f'{stem}{s}fw{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        additional_properties = {
            "Network.SNAT.PrivateRanges": private_ranges,
        },
        sku = network.AzureFirewallSkuArgs(
            name = 'AZFW_VNet',
            tier = 'Standard',
        ),
        ip_configurations = [network.AzureFirewallIPConfigurationArgs(
            name = f'{stem}{s}fw{s}ipc',
            public_ip_address = network.PublicIPAddressArgs(
                id = fw_pip.id,
            ),
            subnet = network.SubnetArgs(
                id = fw_sn_id,
            ),
        )],
        management_ip_configuration = network.AzureFirewallIPConfigurationArgs(
            name = f'{stem}{s}fwm{s}ipc',
            public_ip_address = network.PublicIPAddressArgs(
                id = fwm_pip.id,
            ),
            subnet = network.SubnetArgs(
                id = fwm_sn_id,
            ),
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
    rg = resources.ResourceGroup(f'{stem}{s}vdc{s}rg{s}{suffix}',
        resource_group_name = f'{stem}{s}vdc{s}rg{s}{suffix}',
        location = location,
        tags = tags,
    )
    return rg.name

def route_table(stem, disable_bgp_route_propagation=None, depends_on=None):
    rt = network.RouteTable(f'{stem}{s}rt{s}{suffix}',
        route_table_name = f'{stem}{s}rt{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        disable_bgp_route_propagation = disable_bgp_route_propagation,
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return rt

def route_to_internet(stem, route_table_name):
    r_i = network.Route(f'{stem}{s}r',
        route_name = 'FirewallDefaultRoute', # name required
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
        route_name = f'{stem}{s}r',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        next_hop_type = 'VirtualAppliance',
        next_hop_ip_address = next_hop_ip_address,
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self),
    )
    return r_va

def route_to_virtual_network(stem, route_table_name, address_prefix):
    r_vn = network.Route(f'{stem}{s}r',
        route_name = f'{stem}{s}r',
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
        subnet_name = f'{stem}{s}sn',
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefix = address_prefix,
        route_table = network.RouteTableArgs(
            id = route_table_id,
        ),
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
        subnet_name = name,
        resource_group_name = resource_group_name,
        virtual_network_name = virtual_network_name,
        address_prefix = address_prefix,
        route_table = network.RouteTableArgs(
            id = route_table_id,
        ),
        opts = ResourceOptions(
            parent = self,
            delete_before_replace = True,
            depends_on = depends_on,
        ),
    )
    return sn

def virtual_network(stem, address_spaces):
    vn = network.VirtualNetwork(f'{stem}{s}vn{s}{suffix}',
        virtual_network_name = f'{stem}{s}vn{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        address_space = network.AddressSpaceArgs(
            address_prefixes = address_spaces,
        ),
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
            virtual_network_peering_name = f'{stem}{s}{peer}{s}vnp{s}{suffix}',
            resource_group_name = resource_group_name,
            virtual_network_name = virtual_network_name,
            remote_virtual_network = network.SubResourceArgs(
                id = remote_virtual_network_id
            ),
            allow_forwarded_traffic = allow_forwarded_traffic,
            allow_gateway_transit = allow_gateway_transit,
            use_remote_gateways = use_remote_gateways,
            allow_virtual_network_access = True,
            opts = ResourceOptions(parent=self, depends_on=depends_on),
        )
        return vnp

def vpn_gateway(stem, subnet_id, depends_on=None):
    vpn_gw_pip = network.PublicIPAddress(f'{stem}{s}vpn{s}gw{s}pip{s}{suffix}',
        public_ip_address_name = f'{stem}{s}vpn{s}gw{s}pip{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        public_ip_allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    vpn_gw = network.VirtualNetworkGateway(f'{stem}{s}vpn{s}gw{s}{suffix}',
        virtual_network_gateway_name = f'{stem}{s}vpn{s}gw{s}{suffix}',
        resource_group_name = resource_group_name,
        location = location,
        sku = network.VirtualNetworkGatewaySkuArgs(
            name = 'VpnGw1',
            tier = 'VpnGw1',
        ),
        gateway_type = 'Vpn',
        vpn_type = 'RouteBased',
        enable_bgp = True,
        ip_configurations = [network.VirtualNetworkGatewayIPConfigurationArgs(
            name = f'{stem}{s}vpn{s}gw{s}ipc',
            public_ip_address = network.PublicIPAddressArgs(
                id = vpn_gw_pip.id,
            ),
            subnet = network.SubnetArgs(
                id = subnet_id,
            ),
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
