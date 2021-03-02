from ipaddress import ip_network, ip_address
from pulumi import ComponentResource, ResourceOptions, StackReference
import vdc


class HubProps:
    def __init__(
            self,
            azure_bastion: bool,
            forced_tunnel: bool,
            firewall_address_space: str,
            hub_address_space: str,
            location: str,
            peer: str,
            reference: StackReference,
            resource_group_name: str,
            separator: str,
            stack: str,
            subnets: [str, str, str],
            suffix: str,
            tags: [str, str],
    ):
        self.azure_bastion = azure_bastion
        self.forced_tunnel = forced_tunnel
        self.firewall_address_space = firewall_address_space
        self.hub_address_space = hub_address_space
        self.location = location
        self.peer = peer
        self.reference = reference
        self.resource_group_name = resource_group_name
        self.separator = separator
        self.stack = stack
        self.subnets = subnets
        self.suffix = suffix
        self.tags = tags


class Hub(ComponentResource):
    def __init__(self, name: str, props: HubProps, opts: ResourceOptions = None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # set required vdc variables before calling functions
        vdc.location = props.location
        vdc.resource_group_name = props.resource_group_name
        vdc.s = props.separator
        vdc.self = self
        vdc.suffix = props.suffix
        vdc.tags = props.tags

        # calculate the subnets in the firewall_address_space
        fwz_nw = ip_network(props.firewall_address_space)
        fwz_sn = fwz_nw.subnets(new_prefix=25)  # two /26 subnets required
        fwx_nw = next(fwz_sn)  # for Azure Firewall and Management subnets
        fwz_sn = fwz_nw.address_exclude(fwx_nw)  # consolidate remainder
        dmz_nw = next(fwz_sn)  # largest remaining subnet for DMZ
        fwx_sn = fwx_nw.subnets(new_prefix=26)  # split the /25 into two /26
        fws_nw = next(fwx_sn)  # AzureFirewallSubnet
        fwm_nw = next(fwx_sn)  # AzureFirewallManagementSubnet

        # calculate the subnets in the hub_address_space
        hub_nw = ip_network(props.hub_address_space)
        if hub_nw.prefixlen < 20:  # split evenly between subnets and hosts
            sub_diff = int((hub_nw.max_prefixlen - hub_nw.prefixlen) / 2)
        else:
            sub_diff = 25 - hub_nw.prefixlen  # minimum /25 subnet
        subnets = hub_nw.subnets(prefixlen_diff=sub_diff)
        next_sn = next(subnets)  # first subnet reserved for special uses
        first_sn = next_sn.subnets(new_prefix=26)  # split it into /26 subnets
        gws_nw = next(first_sn)  # GatewaySubnet /26
        rem_nw = next(first_sn)  # at least one more /26 subnet, perhaps more
        rem_sn = rem_nw.subnets(new_prefix=27)  # only need /27 save the rest
        abs_nw = next(rem_sn)  # AzureBastionSubnet /27 or greater

        # cast repeatedly referenced networks to strings
        dmz_ar = str(dmz_nw)
        gws_ar = str(gws_nw)

        # set the separator to be used in resource names
        s = props.separator

        # Azure Virtual Network to which spokes will be peered
        # separate address spaces to simplify custom routing
        hub = vdc.virtual_network(name, [
            props.firewall_address_space,
            props.hub_address_space,
        ],
                                  )

        # AzureFirewallManagementSubnet and Route Table
        # https://docs.microsoft.com/en-us/azure/firewall/forced-tunneling
        hub_fwm_rt = vdc.route_table(
            stem=f'{name}{s}fwm',
            disable_bgp_route_propagation=True,  # required
        )
        # only a default route to the Internet is permitted
        hub_fwm_dg = vdc.route_to_internet(
            stem=f'fwm{s}internet',
            route_table_name=hub_fwm_rt.name,
        )
        hub_fwm_sn = vdc.subnet_special(
            stem=f'{name}{s}fwm',
            name='AzureFirewallManagementSubnet',  # name required
            virtual_network_name=hub.name,
            address_prefix=str(fwm_nw),
            route_table_id=hub_fwm_rt.id,
            depends_on=[hub, hub_fwm_rt, hub_fwm_dg],
        )

        # AzureFirewallSubnet and Route Table 
        hub_fw_rt = vdc.route_table(
            stem=f'{name}{s}fw',
            disable_bgp_route_propagation=False,
        )
        # default route either direct to Internet or forced tunnel
        # turn off SNAT if the next_hop_ip_address is public
        # https://docs.microsoft.com/en-us/azure/firewall/snat-private-range
        private_ranges = 'IANAPrivateRanges'
        if not props.forced_tunnel:
            hub_fw_dg = vdc.route_to_internet(
                stem=f'fw{s}internet',
                route_table_name=hub_fw_rt.name,
            )
        else:
            hub_fw_dg = vdc.route_to_virtual_appliance(
                stem=f'fw{s}tunnel',
                route_table_name=hub_fw_rt.name,
                address_prefix='0.0.0.0/0',
                next_hop_ip_address=props.forced_tunnel,
            )
            ft_ip = ip_address(props.forced_tunnel)
            if not ft_ip.is_private:
                private_ranges = '0.0.0.0/0'
        hub_fw_sn = vdc.subnet_special(
            stem=f'{name}{s}fw',
            name='AzureFirewallSubnet',  # name required
            virtual_network_name=hub.name,
            address_prefix=str(fws_nw),
            route_table_id=hub_fw_rt.id,
            depends_on=[hub, hub_fw_rt, hub_fw_dg],
        )

        # Azure Firewall
        hub_fw = vdc.firewall(
            stem=name,
            fw_sn_id=hub_fw_sn.id,
            fwm_sn_id=hub_fwm_sn.id,
            private_ranges=private_ranges,
            depends_on=[hub_fw_sn, hub_fwm_sn],
        )

        # wait for the private ip address of the firewall to become available
        hub_fw_ip = hub_fw.ip_configurations.apply(
            lambda ipc: ipc[0].private_ip_address
        )
        # It is very important to ensure that there is never a route with an
        # address_prefix which covers the AzureFirewallSubnet.

        # DMZ subnet and Route Table
        hub_dmz_rt = vdc.route_table(
            stem=f'{name}{s}dmz',
            disable_bgp_route_propagation=True,
            depends_on=[hub_fw],
        )
        # default route from DMZ via the firewall
        hub_dmz_dg = vdc.route_to_virtual_appliance(
            stem=f'dmz{s}dg',
            route_table_name=hub_dmz_rt.name,
            address_prefix='0.0.0.0/0',
            next_hop_ip_address=hub_fw_ip,
        )
        # redirect intra-DMZ traffic via the firewall
        hub_dmz_dmz = vdc.route_to_virtual_appliance(
            stem=f'dmz{s}dmz',
            route_table_name=hub_dmz_rt.name,
            address_prefix=dmz_ar,
            next_hop_ip_address=hub_fw_ip,
        )
        # redirect traffic from DMZ to hub via the firewall
        hub_dmz_hub = vdc.route_to_virtual_appliance(
            stem=f'dmz{s}hub',
            route_table_name=hub_dmz_rt.name,
            address_prefix=props.hub_address_space,
            next_hop_ip_address=hub_fw_ip,
        )
        hub_dmz_sn = vdc.subnet_special(  # ToDo add NSG
            stem=f'{name}{s}dmz',
            name='DMZ',  # name not required but preferred
            virtual_network_name=hub.name,
            address_prefix=dmz_ar,
            route_table_id=hub_dmz_rt.id,
            depends_on=[hub_dmz_rt, hub_dmz_dg, hub_dmz_dmz, hub_dmz_hub],
        )

        # GatewaySubnet and Route Table
        hub_gw_rt = vdc.route_table(
            stem=f'{name}{s}gw',
            disable_bgp_route_propagation=False,
            depends_on=[hub_dmz_sn],
        )
        # protect intra-GatewaySubnet traffic from being redirected:
        hub_gw_gw = vdc.route_to_virtual_network(
            stem=f'gw{s}gw',
            route_table_name=hub_gw_rt.name,
            address_prefix=gws_ar,
        )
        # redirect traffic from gateways to DMZ via firewall
        hub_gw_dmz = vdc.route_to_virtual_appliance(
            stem=f'gw{s}dmz',
            route_table_name=hub_gw_rt.name,
            address_prefix=dmz_ar,
            next_hop_ip_address=hub_fw_ip,
        )
        # redirect traffic from gateways to hub via firewall
        hub_gw_hub = vdc.route_to_virtual_appliance(
            stem=f'gw{s}hub',
            route_table_name=hub_gw_rt.name,
            address_prefix=props.hub_address_space,
            next_hop_ip_address=hub_fw_ip,
        )
        hub_gw_sn = vdc.subnet_special(
            stem=f'{name}{s}gw',
            name='GatewaySubnet',  # name required
            virtual_network_name=hub.name,
            address_prefix=gws_ar,
            route_table_id=hub_gw_rt.id,
            depends_on=[hub_gw_rt, hub_gw_gw, hub_gw_dmz, hub_gw_hub],
        )

        # VPN Gateway
        hub_vpn_gw = vdc.vpn_gateway(
            stem=name,
            subnet_id=hub_gw_sn.id,
            depends_on=[hub_gw_sn],
        )

        # ExpressRoute Gateway
        hub_er_gw = vdc.expressroute_gateway(
            stem=name,
            subnet_id=hub_gw_sn.id,
            depends_on=[hub_gw_sn],
        )

        # Route Table to be associated with all hub shared services subnets
        hub_ss_rt = vdc.route_table(
            stem=f'{name}{s}ss',
            disable_bgp_route_propagation=True,
            depends_on=[hub_er_gw, hub_vpn_gw],
        )
        # default route from hub via the firewall
        hub_ss_dg = vdc.route_to_virtual_appliance(
            stem=f'ss{s}dg',
            route_table_name=hub_ss_rt.name,
            address_prefix='0.0.0.0/0',
            next_hop_ip_address=hub_fw_ip,
        )
        # redirect traffic from hub to DMZ via the firewall
        hub_ss_dmz = vdc.route_to_virtual_appliance(
            stem=f'ss{s}dmz',
            route_table_name=hub_ss_rt.name,
            address_prefix=dmz_ar,
            next_hop_ip_address=hub_fw_ip,
        )
        # redirect traffic from hub to gateways via the firewall
        hub_ss_gw = vdc.route_to_virtual_appliance(
            stem=f'ss{s}gw',
            route_table_name=hub_ss_rt.name,
            address_prefix=gws_ar,
            next_hop_ip_address=hub_fw_ip,
        )
        # shared services subnets starting with the second subnet
        for subnet in props.subnets:
            next_sn = next(subnets)
            hub_sn = vdc.subnet(  # ToDo add NSG
                stem=f'{name}{s}{subnet[0]}',
                virtual_network_name=hub.name,
                address_prefix=str(next_sn),
                route_table_id=hub_ss_rt.id,
                depends_on=[hub_ss_rt, hub_ss_dg, hub_ss_dmz, hub_ss_gw],
            )

        # Azure Bastion subnet and host (optional)
        if props.azure_bastion:
            hub_ab = vdc.bastion_host(
                stem=name,
                virtual_network_name=hub.name,
                address_prefix=str(abs_nw),
                depends_on=[hub_er_gw, hub_vpn_gw],
            )

        # VNet Peering between stacks using StackReference (optional)
        if props.peer:
            peer_hub_id = props.reference.get_output('hub_id')
            # VNet Peering (Global) in one direction from stack to peer
            hub_hub = vdc.vnet_peering(
                stem=props.stack,
                virtual_network_name=hub.name,
                peer=props.peer,
                remote_virtual_network_id=peer_hub_id,
                allow_forwarded_traffic=True,
                allow_gateway_transit=False,  # as both hubs have gateways
            )
            # need to invalidate system routes created by VNet Peering
            peer_dmz_ar = props.reference.get_output('dmz_ar')
            peer_fw_ip = props.reference.get_output('fw_ip')
            peer_hub_as = props.reference.get_output('hub_as')
            for route in [
                (f'dmz{s}{props.peer}{s}dmz', hub_dmz_rt.name, peer_dmz_ar),
                (f'dmz{s}{props.peer}{s}hub', hub_dmz_rt.name, peer_hub_as),
                (f'gw{s}{props.peer}{s}dmz', hub_gw_rt.name, peer_dmz_ar),
                (f'gw{s}{props.peer}{s}hub', hub_gw_rt.name, peer_hub_as),
                (f'ss{s}{props.peer}{s}dmz', hub_ss_rt.name, peer_dmz_ar),
                (f'ss{s}{props.peer}{s}hub', hub_ss_rt.name, peer_hub_as),
            ]:
                vdc.route_to_virtual_appliance(
                    stem=route[0],
                    route_table_name=route[1],
                    address_prefix=route[2],
                    next_hop_ip_address=peer_fw_ip,
                )

        # assign properties to hub including from child resources
        self.address_space = props.hub_address_space  # used for routes to the hub
        self.dmz_ar = dmz_ar  # used for routes to the hub
        self.dmz_rt_name = hub_dmz_rt.name  # used to add routes to spokes
        self.er_gw = hub_er_gw  # needed prior to VNet Peering from spokes
        self.fw = hub_fw  # needed prior to VNet Peering from spokes
        self.fw_ip = hub_fw_ip  # used for routes to the hub
        self.fw_rt_name = hub_fw_rt.name  # used for route to the peered spokes
        self.gw_rt_name = hub_gw_rt.name  # used to add routes to spokes
        self.id = hub.id  # exported and used for stack and spoke peering
        self.location = hub.location  # informational
        self.name = hub.name  # exported and used for spoke peering
        self.peer = props.peer  # informational
        self.resource_group_name = props.resource_group_name  # informational
        self.subnets = hub.subnets  # informational
        self.stack = props.stack  # informational
        self.stem = name  # used for VNet Peering from spokes
        self.ss_rt_name = hub_ss_rt.name  # used to add routes to spokes
        self.tags = props.tags  # informational
        self.vpn_gw = hub_vpn_gw  # needed prior to VNet Peering from spokes
        self.register_outputs({})
