from pulumi import ComponentResource, ResourceOptions, StackReference
import vdc

class HubProps:
    def __init__(
        self,
        resource_group_name: str,
        tags: [str, str],
        stack: str,
        dmz_ar: str,
        fwm_ar: str,
        fws_ar: str,
        fwz_as: str,
        gws_ar: str,
        hbs_ar: str,
        hub_ar: str,
        hub_as: str,
        peer: str,
        ref: str,
        subnets: [str, str, str],
    ):
        self.resource_group_name = resource_group_name
        self.tags = tags
        self.stack = stack
        self.dmz_ar = dmz_ar
        self.fwm_ar = fwm_ar
        self.fws_ar = fws_ar
        self.fwz_as = fwz_as
        self.gws_ar = gws_ar
        self.hbs_ar = hbs_ar
        self.hub_ar = hub_ar
        self.hub_as = hub_as
        self.peer = peer
        self.ref = ref
        self.subnets = subnets

class Hub(ComponentResource):
    def __init__(self, name: str, props: HubProps, opts: ResourceOptions=None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # set vdc defaults
        vdc.resource_group_name = props.resource_group_name
        vdc.tags = props.tags
        vdc.self = self

        # Azure Virtual Network to which spokes will be peered
        # separate address spaces to simplify custom routing
        hub = vdc.virtual_network(name, [props.fwz_as, props.hub_as])

        # DMZ subnet
        hub_dmz_sn = vdc.subnet_special( #ToDo add NSG
            stem = f'{name}-dmz',
            name = 'DMZ', # name not required but preferred
            virtual_network_name = hub.name,
            address_prefix = props.dmz_ar,
        )

        # AzureFirewallSubnet
        hub_fw_sn = vdc.subnet_special(
            stem = f'{name}-fw',
            name = 'AzureFirewallSubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = props.fws_ar,
        )

        # GatewaySubnet
        hub_gw_sn = vdc.subnet_special(
            stem = f'{name}-gw',
            name = 'GatewaySubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = props.gws_ar,
        )

        # provisioning of Gateways and Firewall depends_on subnets
        # to avoid contention in the Azure control plane

        # VPN Gateway
        hub_vpn_gw = vdc.vpn_gateway(
            stem = name,
            subnet_id = hub_gw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # ExpressRoute Gateway
        hub_er_gw = vdc.expressroute_gateway(
            stem = name,
            subnet_id = hub_gw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # Azure Firewall
        hub_fw = vdc.firewall(
            stem = name,
            subnet_id = hub_fw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # provisioning of optional subnets depends_on Gateways and Firewall
        # to avoid contention in the Azure control plane

        # AzureBastionSubnet (optional)
        if props.hbs_ar:
            hub_ab_sn = vdc.subnet_special( #ToDo add NSG if required
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet', # name required
                virtual_network_name = hub.name,
                address_prefix = props.hbs_ar,
                depends_on=[hub_er_gw, hub_fw, hub_vpn_gw],
            )

        # AzureFirewallManagementSubnet (optional)
        if props.fwm_ar:
            hub_fwm_sn = vdc.subnet_special(
                stem = f'{name}-fwm',
                name = 'AzureFirewallManagementSubnet', # name required
                virtual_network_name = hub.name,
                address_prefix = props.fwm_ar,
                depends_on=[hub_er_gw, hub_fw, hub_vpn_gw],
            )

        # work around https://github.com/pulumi/pulumi/issues/4040
        hub_fw_ip = hub_fw.ip_configurations.apply(
            lambda ipc: ipc[0].get('private_ip_address')
        )

        # provisioning of Route Tables depends_on Gateways and Firewall
        # to avoid contention in the Azure control plane

        # Route Table only to be associated with the GatewaySubnet
        hub_gw_rt = vdc.route_table(
            stem = f'{name}-gw',
            disable_bgp_route_propagation = False,
            depends_on=[hub_er_gw, hub_fw, hub_vpn_gw],
        )

        # associate GatewaySubnet with Route Table
        hub_gw_sn_rta = vdc.subnet_route_table(
            stem = f'{name}-gw',
            route_table_id = hub_gw_rt.id,
            subnet_id = hub_gw_sn.id,
        )

        # Route Table only to be associated with DMZ subnet
        hub_dmz_rt = vdc.route_table(
            stem = f'{name}-dmz',
            disable_bgp_route_propagation = True,
            depends_on=[hub_er_gw, hub_fw, hub_vpn_gw],
        )

        # associate DMZ subnet with Route Table
        hub_dmz_sn_rta = vdc.subnet_route_table(
            stem = f'{name}-dmz',
            route_table_id = hub_dmz_rt.id,
            subnet_id = hub_dmz_sn.id,
        )

        # Route Table only to be associated with shared services subnets in hub
        hub_ss_rt = vdc.route_table(
            stem = f'{name}-ss',
            disable_bgp_route_propagation = True,
            depends_on=[hub_er_gw, hub_fw, hub_vpn_gw],
        )

        # protect intra-GatewaySubnet traffic from being redirected
        vdc.route_to_virtual_network(
            stem = f'gw-gw',
            route_table_name = hub_gw_rt.name,
            address_prefix = props.gws_ar,
        )

        # partially or fully invalidate system routes to redirect traffic
        for route in [
            (f'gw-dmz', hub_gw_rt.name, props.dmz_ar),
            (f'gw-hub', hub_gw_rt.name, props.hub_as),
            (f'dmz-dg', hub_dmz_rt.name, '0.0.0.0/0'),
            (f'dmz-dmz', hub_dmz_rt.name, props.dmz_ar),
            (f'dmz-hub', hub_dmz_rt.name, props.hub_as),
            (f'ss-dg', hub_ss_rt.name, '0.0.0.0/0'),
            (f'ss-dmz', hub_ss_rt.name, props.dmz_ar),
            (f'ss-gw', hub_ss_rt.name, props.gws_ar),
        ]:
            vdc.route_to_virtual_appliance(
                stem = route[0],
                route_table_name = route[1],
                address_prefix = route[2],
                next_hop_in_ip_address = hub_fw_ip,
            )

        # VNet Peering between stacks using StackReference
        if props.peer:
            peer_stack = StackReference(props.ref)
            peer_hub_id = peer_stack.get_output('hub_id')

            # VNet Peering (Global) in one direction from stack to peer
            hub_hub = vdc.vnet_peering(
                stem = props.stack,
                virtual_network_name = hub.name,
                peer = props.peer,
                remote_virtual_network_id = peer_hub_id,
                allow_forwarded_traffic = True,
                allow_gateway_transit = False, # as both hubs have gateways
            )

            # need to invalidate system routes created by Global VNet Peering
            peer_dmz_ar = peer_stack.get_output('dmz_ar') 
            peer_fw_ip = peer_stack.get_output('fw_ip')
            peer_hub_as = peer_stack.get_output('hub_as')
            
            for route in [
                (f'dmz-{props.peer}-dmz', hub_dmz_rt.name, peer_dmz_ar),
                (f'dmz-{props.peer}-hub', hub_dmz_rt.name, peer_hub_as),
                (f'gw-{props.peer}-dmz', hub_gw_rt.name, peer_dmz_ar),
                (f'gw-{props.peer}-hub', hub_gw_rt.name, peer_hub_as),
                (f'ss-{props.peer}-dmz', hub_ss_rt.name, peer_dmz_ar),
                (f'ss-{props.peer}-hub', hub_ss_rt.name, peer_hub_as),
            ]:
                vdc.route_to_virtual_appliance(
                    stem = route[0],
                    route_table_name = route[1],
                    address_prefix = route[2],
                    next_hop_in_ip_address = peer_fw_ip,
                )
        
        # provisioning of subnets depends_on Route Table (Gateways & Firewall)
        # to avoid contention in the Azure control plane

        # shared services subnets
        subnet_range = props.hub_ar
        for subnet in props.subnets:
            hub_sn = vdc.subnet( #ToDo add NSG
                stem = f'{name}-{subnet[0]}',
                virtual_network_name = hub.name,
                address_prefix = subnet_range,
                depends_on=[hub_ss_rt],
            )
            # associate all hub shared services subnets to Route Table        
            hub_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-{subnet[0]}',
                route_table_id = hub_ss_rt.id,
                subnet_id = hub_sn.id,
            )
            subnet_range = vdc.subnet_next(props.hub_as, subnet_range)

        # assign properties to hub including from child resources
        self.address_spaces = hub.address_spaces # informational
        self.dmz_ar = props.dmz_ar # used to construct routes to the hub
        self.dmz_rt_name = hub_dmz_rt.name # used to add routes to spokes
        self.er_gw = hub_er_gw # needed prior to VNet Peering from spokes
        self.fw = hub_fw # needed prior to VNet Peering from spokes
        self.fw_ip = hub_fw_ip # used to construct routes to the hub
        self.gw_rt_name = hub_gw_rt.name # used to add routes to spokes
        self.hub_as = props.hub_as # used to construct routes to the hub
        self.id = hub.id # exported and used for stack and spoke peering
        self.location = hub.location # informational
        self.name = hub.name # exported and used for spoke peering
        self.peer = props.peer # informational
        self.resource_group_name = props.resource_group_name # informational
        self.subnets = hub.subnets # exported as informational
        self.stack = props.stack # informational
        self.stem = name # used for VNet Peering from spokes
        self.ss_rt_name = hub_ss_rt.name # used to add routes to spokes
        self.tags = props.tags # informational
        self.vpn_gw = hub_vpn_gw # needed prior to VNet Peering from spokes
        self.register_outputs({})
