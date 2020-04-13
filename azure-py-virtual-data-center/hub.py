from pulumi import Config, Output, ComponentResource, ResourceOptions, get_project, StackReference
from pulumi_azure import core
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

        # Retrieve configuration
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
            f'{name}-dmz',
            'DMZ', # name not required but preferred
            hub.name,
            dmz_ar,
        )

        # AzureFirewallSubnet
        hub_fw_sn = vdc.subnet_special(
            f'{name}-fw',
            'AzureFirewallSubnet', # name required
            hub.name,
            fws_ar,
        )

        #AzureFirewallManagementSubnet (optional)
        if fwm_ar:
            hub_fwm_sn = vdc.subnet_special(
                f'{name}-fwm',
                'AzureFirewallManagementSubnet', # name required
                hub.name,
                fwm_ar,
            )

        # GatewaySubnet
        hub_gw_sn = vdc.subnet_special(
            f'{name}-gw',
            'GatewaySubnet', # name required
            hub.name,
            gws_ar,
        )

        # AzureBastionSubnet (optional)
        if hbs_ar:
            hub_ab_sn = vdc.subnet_special( #ToDo add NSG if required
                f'{name}-ab',
                'AzureBastionSubnet', # name required
                hub.name,
                hbs_ar,
            )

        # Provisioning of gateways and firewall depends_on subnets because of
        # contention in the Azure control plane that otherwise results 

        # VPN Gateway
        hub_vpn_gw = vdc.vpn_gateway(
            name,
            hub_gw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # ExpressRoute Gateway
        hub_er_gw = vdc.expressroute_gateway(
            name,
            hub_gw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # Public IP for the Azure Firewall
        hub_fw = vdc.firewall(
            name,
            hub_fw_sn.id,
            depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
        )

        # work around https://github.com/pulumi/pulumi/issues/4040
        hub_fw_ip = hub_fw.ip_configurations.apply(
            lambda ipc: ipc[0].get('private_ip_address')
        )

        # Provisioning of routes depends_on gateways and firewall because of
        # contention in the Azure control plane that otherwise results 

        # route table only to be associated with the GatewaySubnet
        hub_gw_rt = vdc.route_table(
            f'{name}-gw',
            disable_bgp_route_propagation = False,
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
        )

        # associate GatewaySubnet with route table
        hub_gw_sn_rta = vdc.subnet_route_table(
            f'{name}-gw',
            hub_gw_rt.id,
            hub_gw_sn.id,
        )

        # partially invalidate system route (excluding AzureFirewallSubnet)
        hub_gw_dmz_r = vdc.route_to_virtual_appliance(
            f'{name}-gw-dmz',
            hub_gw_rt.name,
            dmz_ar,
            hub_fw_ip,
        )

        # protect intra-GatewaySubnet traffic from being redirected (see next)
        hub_gw_gw_r = vdc.route_to_virtual_network(
            f'{name}-gw-gw',
            hub_gw_rt.name,
            gws_ar,
        )

        # invalidate system route to hub address space (overlaps GatewaySubnet)
        hub_gw_hub_r = vdc.route_to_virtual_appliance(
            f'{name}-gw-hub',
            hub_gw_rt.name,
            hub_as,
            hub_fw_ip,
        )
        
        # route table only to be associated with DMZ subnet
        hub_dmz_rt = vdc.route_table(
            f'{name}-dmz',
            disable_bgp_route_propagation = True,
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
        )

        # associate DMZ subnet with route table
        hub_dmz_sn_rta = vdc.subnet_route_table(
            f'{name}-dmz',
            hub_dmz_rt.id,
            hub_dmz_sn.id,
        )

        # partially invalidate system route (excluding AzureFirewallSubnet)
        hub_dmz_dmz_r = vdc.route_to_virtual_appliance(
            f'{name}-dmz-dmz',
            hub_dmz_rt.name,
            dmz_ar,
            hub_fw_ip,
        )
        
        # invalidate system route to hub address space
        hub_dmz_hub_r = vdc.route_to_virtual_appliance(
            f'{name}-dmz-hub',
            hub_dmz_rt.name,
            hub_as,
            hub_fw_ip,
        )

        # invalidate system route to Internet
        hub_dmz_dg_r = vdc.route_to_virtual_appliance(
            f'{name}-dmz-dg',
            hub_dmz_rt.name,
            '0.0.0.0/0',
            hub_fw_ip,
        )

        # route table only to be associated with ordinary subnets in hub
        hub_sn_rt = vdc.route_table(
            f'{name}-sn',
            disable_bgp_route_propagation = True,
            depends_on=[hub_vpn_gw, hub_er_gw, hub_fw],
        )

        # partially invalidate system route (excluding AzureFirewallSubnet)
        hub_sn_dmz_r = vdc.route_to_virtual_appliance(
            f'{name}-sn-dmz',
            hub_sn_rt.name,
            dmz_ar,
            hub_fw_ip,
        )

        # partially invalidate system route (excluding other hub subnets)
        hub_sn_gw_r = vdc.route_to_virtual_appliance(
            f'{name}-sn-gw',
            hub_sn_rt.name,
            gws_ar,
            hub_fw_ip,
        )

        # invalidate system route to Internet
        hub_sn_dg_r = vdc.route_to_virtual_appliance(
            f'{name}-sn-dg',
            hub_sn_rt.name,
            '0.0.0.0/0',
            hub_fw_ip,
        )

        # VNet Peering between stacks requires additional routes
        peer = props.config.get('peer')
        if peer:
            org = props.config.require('org')
            project = get_project()
            peer_stack = StackReference(f'{org}/{project}/{peer}')
            peer_hub_id = peer_stack.get_output('hub_id')
            peer_hub_name = peer_stack.get_output('hub_name')
            # need a reference to the peer hub VNet but this doesn't work
            #peer_hub = network.VirtualNetwork.get(peer_hub_name, peer_hub_id)
            #peer_fw_ip = peer_hub.hub_fw_ip
            #peer_dmz_ar = peer_hub.peer_dmz_ar 
            #peer_hub_as = peer_hub.peer_hub_as

            hub_hub = vdc.vnet_peering(
                props.stack,
                hub.name,
                peer,
                peer_hub_id,
                allow_forwarded_traffic = True,
                allow_gateway_transit = False, # as both hubs have gateways
            )
#            #routes ready to go when we have peer_fw_ip, peer_dmz_ar and peer_hub_as      
#            # partially invalidate system route (excluding AzureFirewallSubnet)
#            stack_dmz_peer_dmz_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-dmz-{peer}-dmz',
#                hub_dmz_rt.name,
#                peer_dmz_ar,
#                peer_fw_ip,
#            )
#        
#            # invalidate system route to peer hub address space
#            stack_dmz_peer_hub_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-dmz-{peer}-hub',
#                hub_dmz_rt.name,
#                peer_hub_as,
#                peer_fw_ip,
#            )
#        
#            # partially invalidate system route (excluding AzureFirewallSubnet)
#            stack_sn_peer_dmz_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-sn-{peer}-dmz',
#                hub_sn_rt.name,
#                peer_dmz_ar,
#                peer_fw_ip,
#            )
#        
#            # invalidate system route to peer hub address space
#            stack_sn_peer_hub_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-sn-{peer}-hub',
#                hub_sn_rt.name,
#                peer_hub_as,
#                peer_fw_ip,
#            )
#        
#            # invalidate system route to peer hub address space
#            stack_gw_peer_hub_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-gw-{peer}-hub',
#                hub_gw_rt.name,
#                peer_hub_as,
#                peer_fw_ip,
#            )
#                        
#            # partially invalidate system route (excluding AzureFirewallSubnet)
#            stack_gw_peer_dmz_r = vdc.route_to_virtual_appliance(
#                f'{props.stack}-gw-{peer}-dmz',
#                hub_gw_rt.name,
#                peer_dmz_ar,
#                peer_fw_ip,
#            )
        
        # Provisioning of subnets depends_on gateways, firewall and route table
        # to avoid contention in the Azure control plane

        # Only one shared subnet is provisioned as an example, but many can be
        if hub_ar: #ToDo replace with loop
            hub_example_sn = vdc.subnet( #ToDo add NSG
                f'{name}-example',
                hub.name,
                hub_ar,
                depends_on=[hub_sn_rt],
            )

            # associate all hub shared services subnets to route table        
            hub_example_sn_rta = vdc.subnet_route_table(
                f'{name}-example',
                hub_sn_rt.id,
                hub_example_sn.id,
            )

        self.hub_name = hub.name # exported perhaps not needed
        self.hub_id = hub.id # exported and using for peering
        self.hub_subnets = hub.subnets # exported as informational
        self.dmz_ar = dmz_ar # needed for stack peering routes
        self.hubs_as = hub_as # needed for stack peering routes
        self.hub_er_gw = hub_er_gw # needed prior to VNet Peering from spokes
        self.hub_vpn_gw = hub_vpn_gw # needed prior to VNet Peering from spokes
        self.hub_fw = hub_fw # needed prior to VNet Peering from spokes
        self.hub_fw_ip = hub_fw_ip # used to construct routes
        self.hub_gw_rt_name = hub_gw_rt.name # used to add routes to spokes
        self.hub_dmz_rt_name = hub_dmz_rt.name # used to add routes to spokes
        self.hub_sn_rt_name = hub_sn_rt.name # used to add routes to spokes
        self.register_outputs({})
