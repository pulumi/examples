from ipaddress import ip_network
from pulumi import ComponentResource, ResourceOptions, StackReference
import vdc

class HubProps:
    def __init__(
        self,
        azure_bastion: bool,
        forced_tunnel: bool,
        firewall_address_space: str,
        hub_address_space: str,
        peer: str,
        reference: str,
        resource_group_name: str,
        stack: str,
        subnets: [str, str, str],
        tags: [str, str],
    ):
        self.azure_bastion = azure_bastion
        self.forced_tunnel = forced_tunnel
        self.firewall_address_space = firewall_address_space
        self.hub_address_space = hub_address_space
        self.peer = peer
        self.reference = reference
        self.resource_group_name = resource_group_name
        self.stack = stack
        self.subnets = subnets
        self.tags = tags

class Hub(ComponentResource):
    def __init__(self, name: str, props: HubProps, opts: ResourceOptions=None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # set vdc defaults
        vdc.resource_group_name = props.resource_group_name
        vdc.tags = props.tags
        vdc.self = self

        # calculate the subnets in the firewall_address_space
        fwz_nw = ip_network(props.firewall_address_space)
        fwz_sn = fwz_nw.subnets(new_prefix=25) # two /26 subnets required
        fwx_nw = next(fwz_sn) # for Azure Firewall and Management subnets
        fwz_sn = fwz_nw.address_exclude(fwx_nw) # consolidate remainder
        dmz_nw = next(fwz_sn) # largest remaining subnet for DMZ
        fwx_sn = fwx_nw.subnets(new_prefix=26) # split the /25 into two /26
        fws_nw = next(fwx_sn) # AzureFirewallSubnet
        fwm_nw = next(fwx_sn) # AzureFirewallManagementSubnet

        # calculate the subnets in the hub_address_space
        hub_nw = ip_network(props.hub_address_space)
        pfl_diff = int((hub_nw.max_prefixlen - hub_nw.prefixlen) / 2)
        subnets = hub_nw.subnets(prefixlen_diff=pfl_diff)
        next_sn = next(subnets) # first subnet reserved for GatewaySubnet etc
        first_sn = next_sn.subnets(new_prefix=26) # for subdivision
        gws_nw = next(first_sn) # GatewaySubnet subnet /26
        ab_nw = next(first_sn) # AzureBastionSubnet /27 or greater

        # cast repeatedly referenced networks to strings
        dmz_ar = str(dmz_nw)
        gws_ar = str(gws_nw)

        # Azure Virtual Network to which spokes will be peered
        # separate address spaces to simplify custom routing
        hub = vdc.virtual_network(name, [
                props.firewall_address_space,
                props.hub_address_space,
            ],
        )

        # GatewaySubnet
        hub_gw_sn = vdc.subnet_special(
            stem = f'{name}-gw',
            name = 'GatewaySubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = gws_ar,
        )

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
            address_prefix = str(fws_nw),
        )

        # AzureFirewallManagementSubnet
        hub_fwm_sn = vdc.subnet_special(
            stem = f'{name}-fwm',
            name = 'AzureFirewallManagementSubnet', # name required
            virtual_network_name = hub.name,
            address_prefix = str(fwm_nw),
        )

        # provisioning of Gateways and Firewall depends_on subnets
        # to avoid contention in the Azure control plane

        # Azure Firewall
        hub_fw = vdc.firewall(
            stem = name,
            fw_sn_id = hub_fw_sn.id,
            fwm_sn_id = hub_fwm_sn.id,
            depends_on = [hub_dmz_sn, hub_fw_sn, hub_fwm_sn, hub_gw_sn],
        )

        # VPN Gateway
        hub_vpn_gw = vdc.vpn_gateway(
            stem = name,
            subnet_id = hub_gw_sn.id,
            depends_on = [hub_dmz_sn, hub_fw_sn, hub_fwm_sn, hub_gw_sn],
        )

        # ExpressRoute Gateway
        hub_er_gw = vdc.expressroute_gateway(
            stem = name,
            subnet_id = hub_gw_sn.id,
            depends_on = [hub_dmz_sn, hub_fw_sn, hub_fwm_sn, hub_gw_sn],
        )

        # provisioning of optional subnets depends_on Gateways and Firewall
        # to avoid contention in the Azure control plane

        # AzureBastionSubnet (optional)
        if props.azure_bastion:
            hub_ab_sn = vdc.subnet_special( #ToDo add NSG if required
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet', # name required
                virtual_network_name = hub.name,
                address_prefix = str(ab_nw),
                depends_on = [hub_er_gw, hub_fw, hub_vpn_gw],
            )
            hub_ab = vdc.bastion_host(
                stem = name,
                subnet_id = hub_ab_sn.id,
            )

        #ToDo requires Azure API version 2019-11-01 or later
        #if props.forced_tunnel:
        # https://docs.microsoft.com/en-us/azure/firewall/forced-tunneling

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
            depends_on = [hub_er_gw, hub_fw, hub_vpn_gw],
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
            depends_on = [hub_er_gw, hub_fw, hub_vpn_gw],
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
            depends_on = [hub_er_gw, hub_fw, hub_vpn_gw],
        )

        # protect intra-GatewaySubnet traffic from being redirected
        vdc.route_to_virtual_network(
            stem = f'gw-gw',
            route_table_name = hub_gw_rt.name,
            address_prefix = gws_ar,
        )

        # partially or fully invalidate system routes to redirect traffic
        for route in [
            (f'gw-dmz', hub_gw_rt.name, dmz_ar),
            (f'gw-hub', hub_gw_rt.name, props.hub_address_space),
            (f'dmz-dg', hub_dmz_rt.name, '0.0.0.0/0'),
            (f'dmz-dmz', hub_dmz_rt.name, dmz_ar),
            (f'dmz-hub', hub_dmz_rt.name, props.hub_address_space),
            (f'ss-dg', hub_ss_rt.name, '0.0.0.0/0'),
            (f'ss-dmz', hub_ss_rt.name, dmz_ar),
            (f'ss-gw', hub_ss_rt.name, gws_ar),
        ]:
            vdc.route_to_virtual_appliance(
                stem = route[0],
                route_table_name = route[1],
                address_prefix = route[2],
                next_hop_in_ip_address = hub_fw_ip,
            )

        # VNet Peering between stacks using StackReference
        if props.peer:
            peer_stack = StackReference(props.reference)
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

        # shared services subnets starting with the second subnet
        next_sn = next(subnets)
        for subnet in props.subnets:
            hub_sn = vdc.subnet( #ToDo add NSG
                stem = f'{name}-{subnet[0]}',
                virtual_network_name = hub.name,
                address_prefix = str(next_sn),
                depends_on = [hub_ss_rt],
            )
            # associate all hub shared services subnets to Route Table        
            hub_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-{subnet[0]}',
                route_table_id = hub_ss_rt.id,
                subnet_id = hub_sn.id,
            )
            next_sn = next(subnets)

        # assign properties to hub including from child resources
        self.address_spaces = hub.address_spaces # informational
        self.dmz_ar = dmz_ar # used for routes to the hub
        self.dmz_rt_name = hub_dmz_rt.name # used to add routes to spokes
        self.er_gw = hub_er_gw # needed prior to VNet Peering from spokes
        self.fw = hub_fw # needed prior to VNet Peering from spokes
        self.fw_ip = hub_fw_ip # used for routes to the hub
        self.gw_rt_name = hub_gw_rt.name # used to add routes to spokes
        self.hub_as = props.hub_address_space # used for routes to the hub
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
