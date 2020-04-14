from pulumi import Config, Output, ComponentResource, ResourceOptions, get_project, StackReference
from pulumi_azure import core, network
import vdc

class HubProps:
    def __init__(
        self,
        config: Config,
        resource_group: core.ResourceGroup,
        tags: [str, str],
        stack: str,
    ):
        self.config = config
        self.resource_group = resource_group
        self.tags = tags
        self.stack = stack

class Hub(ComponentResource):
    def __init__(self, name: str, props: HubProps, opts: ResourceOptions=None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # retrieve configuration
        dmz_ar = props.config.require('dmz_ar')
        fwm_ar = props.config.get('fwm_ar')
        fws_ar = props.config.require('fws_ar')
        fwz_as = props.config.require('fwz_as')
        gws_ar = props.config.require('gws_ar')
        hbs_ar = props.config.get('hbs_ar')
        hub_ar = props.config.get('hub_ar')
        hub_as = props.config.require('hub_as')

        # set vdc defaults
        vdc.resource_group_name = props.resource_group.name
        vdc.location = props.resource_group.location
        vdc.tags = props.tags
        vdc.self = self

        # Azure Virtual Network to which spokes will be peered
        # separate address spaces to simplify custom routing
        hub = vdc.virtual_network(name, [fwz_as, hub_as])

        # DMZ subnet
        hub_dmz_sn = vdc.subnet_special( #ToDo add NSG
            stem = f'{name}-dmz',
            name = 'DMZ', # name not required but preferred
            virtual_network_name = hub.name,
            address_prefix = dmz_ar,
        )

        # AzureFirewallSubnet
        hub_fw_sn = vdc.subnet_special(
            stem = f'{name}-fw',
            name = 'AzureFirewallSubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = fws_ar,
        )

        # AzureFirewallManagementSubnet (optional)
        if fwm_ar:
            hub_fwm_sn = vdc.subnet_special(
                stem = f'{name}-fwm',
                name = 'AzureFirewallManagementSubnet', # name required
                virtual_network_name = hub.name,
                address_prefix = fwm_ar,
            )

        # GatewaySubnet
        hub_gw_sn = vdc.subnet_special(
            stem = f'{name}-gw',
            name = 'GatewaySubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = gws_ar,
        )

        # AzureBastionSubnet (optional)
        if hbs_ar:
            hub_ab_sn = vdc.subnet_special( #ToDo add NSG if required
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet', # name required
                virtual_network_name = hub.name,
                address_prefix = hbs_ar,
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
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
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
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
        )

        # associate DMZ subnet with Route Table
        hub_dmz_sn_rta = vdc.subnet_route_table(
            stem = f'{name}-dmz',
            route_table_id = hub_dmz_rt.id,
            subnet_id = hub_dmz_sn.id,
        )

        # Route Table only to be associated with ordinary subnets in hub
        hub_sn_rt = vdc.route_table(
            stem = f'{name}-sn',
            disable_bgp_route_propagation = True,
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
        )

        # protect intra-GatewaySubnet traffic from being redirected
        vdc.route_to_virtual_network(
            stem = f'gw-gw',
            route_table_name = hub_gw_rt.name,
            address_prefix = gws_ar,
        )

        # partially or fully invalidate system routes to redirect traffic
        routes_to_hub_firewall = [
            (f'gw-dmz', hub_gw_rt.name, dmz_ar),
            (f'gw-hub', hub_gw_rt.name, hub_as),
            (f'dmz-dg', hub_dmz_rt.name, '0.0.0.0/0'),
            (f'dmz-dmz', hub_dmz_rt.name, dmz_ar),
            (f'dmz-hub', hub_dmz_rt.name, hub_as),
            (f'sn-dg', hub_sn_rt.name, '0.0.0.0/0'),
            (f'sn-dmz', hub_sn_rt.name, dmz_ar),
            (f'sn-gw', hub_sn_rt.name, gws_ar),
        ]
        
        for route in routes_to_hub_firewall:
            vdc.route_to_virtual_appliance(
                stem = route[0],
                route_table_name = route[1],
                address_prefix = route[2],
                next_hop_in_ip_address = hub_fw_ip,
            )

        # VNet Peering between stacks using StackReference
        peer = props.config.get('peer')
        if peer:
            org = props.config.require('org')
            project = get_project()
            peer_stack = StackReference(f'{org}/{project}/{peer}')
            peer_hub_id = peer_stack.get_output('hub_id')
            peer_fw_ip = peer_stack.get_output('hub_fw_ip')
            peer_dmz_ar = peer_stack.get_output('dmz_ar') 
            peer_hub_as = peer_stack.get_output('hub_as')

            # VNet Peering (Global) in one direction from stack to peer
            hub_hub = vdc.vnet_peering(
                stem = props.stack,
                virtual_network_name = hub.name,
                peer = peer,
                remote_virtual_network_id = peer_hub_id,
                allow_forwarded_traffic = True,
                allow_gateway_transit = False, # as both hubs have gateways
            )

            # needed to invalidate system routes created by Global VNet Peering
            routes_to_peer_firewall = [
                (f'dmz-{peer}-dmz', hub_dmz_rt.name, peer_dmz_ar),
                (f'dmz-{peer}-hub', hub_dmz_rt.name, peer_hub_as),
                (f'gw-{peer}-hub', hub_gw_rt.name, peer_hub_as),
                (f'gw-{peer}-dmz', hub_gw_rt.name, peer_dmz_ar),
                (f'sn-{peer}-dmz', hub_sn_rt.name, peer_dmz_ar),
                (f'sn-{peer}-hub', hub_sn_rt.name, peer_hub_as),
            ]

            for route in routes_to_peer_firewall:
                vdc.route_to_virtual_appliance(
                    stem = route[0],
                    route_table_name = route[1],
                    address_prefix = route[2],
                    next_hop_in_ip_address = peer_fw_ip,
                )
        
        # provisioning of subnets depends_on Route Table (Gateways & Firewall)
        # to avoid contention in the Azure control plane

        # only one shared subnet is provisioned as an example, but many can be
        if hub_ar: #ToDo replace with loop
            hub_example_sn = vdc.subnet( #ToDo add NSG
                stem = f'{name}-example',
                virtual_network_name = hub.name,
                address_prefix = hub_ar,
                depends_on=[hub_sn_rt],
            )

            # associate all hub shared services subnets to Route Table        
            hub_example_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-example',
                route_table_id = hub_sn_rt.id,
                subnet_id = hub_example_sn.id,
            )

        combined_output = Output.all(
            hub_dmz_rt.name,
            hub_er_gw,
            hub_fw,
            hub_fw_ip,
            hub_gw_rt.name,
            hub.id,
            hub.name,
            hub_sn_rt.name,
            hub.subnets,
            hub_vpn_gw,
        )

        self.hub_dmz_rt_name = hub_dmz_rt.name # used to add routes to spokes
        self.hub_er_gw = hub_er_gw # needed prior to VNet Peering from spokes
        self.hub_fw = hub_fw # needed prior to VNet Peering from spokes
        self.hub_fw_ip = hub_fw_ip # used to construct routes
        self.hub_gw_rt_name = hub_gw_rt.name # used to add routes to spokes
        self.hub_id = hub.id # exported and used for peering
        self.hub_name = hub.name # exported and used for peering
        self.hub_sn_rt_name = hub_sn_rt.name # used to add routes to spokes
        self.hub_subnets = hub.subnets # exported as informational
        self.hub_vpn_gw = hub_vpn_gw # needed prior to VNet Peering from spokes
        self.register_outputs({})
