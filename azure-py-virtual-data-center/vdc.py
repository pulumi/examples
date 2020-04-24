from pulumi import ResourceOptions
from pulumi.resource import CustomTimeouts
from pulumi_azure import core, network

# Variables that must be injected when calling:
# vdc.resource_group_name = props.resource_group_name
# vdc.tags = props.tags
# vdc.self = self

def expressroute_gateway(stem, subnet_id, depends_on=[]):
    er_gw_pip = network.PublicIp(
        f'{stem}-er-gw-pip-',
        resource_group_name = resource_group_name,
        allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self),
    )
    er_gw = network.VirtualNetworkGateway(
        f'{stem}-er-gw-',
        resource_group_name = resource_group_name,
        sku = 'Standard',
        type = 'ExpressRoute',
        vpn_type = 'RouteBased',
        ip_configurations = [{
            'name': f'{stem}-er-gw-ipconf',
            'subnet_id': subnet_id,
            'publicIpAddressId': er_gw_pip.id,
        }],
        tags = tags,
        opts = ResourceOptions(
            parent=self,
            depends_on=depends_on,
            custom_timeouts=CustomTimeouts(
                create='1h',
                update='1h',
                delete='1h',
            ),
        ),
    )
    return er_gw

def firewall(stem, subnet_id, depends_on=[]):
    fw_pip = network.PublicIp(
        f'{stem}-fw-pip-',
        resource_group_name = resource_group_name,
        sku = 'Standard',
        allocation_method = 'Static',
        tags = tags,
        opts = ResourceOptions(parent=self),
    )
    fw = network.Firewall(
        f'{stem}-fw-',
        resource_group_name = resource_group_name,
        ip_configurations = [{
            'name': f'{stem}-fw-ipconf',
            'subnet_id': subnet_id,
            'publicIpAddressId': fw_pip.id,
        }],
        tags = tags,
        opts = ResourceOptions(
            parent=self,
            depends_on=depends_on,
            custom_timeouts=CustomTimeouts(
                create='1h',
                update='1h',
                delete='1h',
            ),
        ),
    )
    return fw

def resource_group(stem):
    rg = core.ResourceGroup(
        f'{stem}-vdc-rg-',
        tags = tags,
    )
    return rg.name

def route_table(stem, disable_bgp_route_propagation=None, depends_on=[]):
    rt = network.RouteTable(
        f'{stem}-rt-',
        resource_group_name = resource_group_name,
        disable_bgp_route_propagation = disable_bgp_route_propagation,
        tags = tags,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return rt

def route_to_virtual_appliance(
        stem,
        route_table_name,
        address_prefix,
        next_hop_in_ip_address,
    ):
    r_va = network.Route(
        f'{stem}-r-',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        next_hop_type = 'VirtualAppliance',
        next_hop_in_ip_address = next_hop_in_ip_address,
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self),
    )
    return r_va

def route_to_virtual_network(stem, route_table_name, address_prefix):
    r_vn = network.Route(
        f'{stem}-r-',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        next_hop_type = 'VnetLocal',
        route_table_name = route_table_name,
        opts = ResourceOptions(parent=self),
    )
    return r_vn

def subnet(stem, virtual_network_name, address_prefix, depends_on=[]):
    sn = network.Subnet(
        f'{stem}-sn-',
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        virtual_network_name = virtual_network_name,
        opts = ResourceOptions(parent=self, depends_on=depends_on),
    )
    return sn

def subnet_route_table(stem, route_table_id, subnet_id):
    rta = network.SubnetRouteTableAssociation(
        f'{stem}-sn-rta',
        route_table_id = route_table_id,
        subnet_id = subnet_id,
        opts = ResourceOptions(parent=self),
    )
    return rta

def subnet_special(
        stem,
        name,
        virtual_network_name,
        address_prefix,
        depends_on=[],
    ):
    sn = network.Subnet(
        f'{stem}-sn',
        name = name,
        resource_group_name = resource_group_name,
        address_prefix = address_prefix,
        virtual_network_name = virtual_network_name,
        opts = ResourceOptions(
            parent=self,
            delete_before_replace=True,
            depends_on=depends_on,
        ),
    )
    return sn

def virtual_network(stem, address_spaces):
    vn = network.VirtualNetwork(
        f'{stem}-vn-',
        resource_group_name = resource_group_name,
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
        allow_forwarded_traffic=None,
        allow_gateway_transit=None,
        use_remote_gateways=None,
        depends_on=[],
    ):
        vnp = network.VirtualNetworkPeering(
            f'{stem}-{peer}-vnp-',
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

def vpn_gateway(stem, subnet_id, depends_on=[]):
    vpn_gw_pip = network.PublicIp(
        f'{stem}-vpn-gw-pip-',
        resource_group_name = resource_group_name,
        allocation_method = 'Dynamic',
        tags = tags,
        opts = ResourceOptions(parent=self),
    )
    vpn_gw = network.VirtualNetworkGateway(
        f'{stem}-vpn-gw-',
        resource_group_name = resource_group_name,
        sku = 'VpnGw1',
        type = 'Vpn',
        vpn_type = 'RouteBased',
        ip_configurations = [{
            'name': f'{stem}-vpn-gw-ipconf',
            'subnet_id': subnet_id,
            'publicIpAddressId': vpn_gw_pip.id,
        }],
        tags = tags,
        opts = ResourceOptions(
            parent=self,
            depends_on=depends_on,
            custom_timeouts=CustomTimeouts(
                create='1h',
                update='1h',
                delete='1h',
            ),
        ),
    )
    return vpn_gw

if __name__ == "__main__":
    import sys
    vdc(int(sys.argv[1]))
