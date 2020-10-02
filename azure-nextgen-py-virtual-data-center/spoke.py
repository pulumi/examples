from ipaddress import ip_network
from pulumi import ComponentResource, ResourceOptions, StackReference
from hub import Hub
import vdc

class SpokeProps:
    def __init__(
        self,
        azure_bastion: bool,
        fw_rt_name: str,
        hub: Hub,
        location: str,
        peer: str,
        reference: StackReference,
        resource_group_name: str,
        spoke_address_space: str,
        subnets: [str, str, str],
        suffix: str,
        tags: [str, str],
    ):
        self.azure_bastion = azure_bastion
        self.fw_rt_name = fw_rt_name
        self.hub = hub
        self.location = location
        self.peer = peer
        self.reference = reference
        self.resource_group_name = resource_group_name
        self.spoke_address_space = spoke_address_space
        self.subnets = subnets
        self.suffix = suffix
        self.tags = tags

class Spoke(ComponentResource):
    def __init__(self, name: str, props: SpokeProps,
            opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # set required vdc variables before calling functions
        vdc.location = props.location
        vdc.resource_group_name = props.resource_group_name
        vdc.suffix = props.suffix
        vdc.tags = props.tags
        vdc.self = self

        # calculate the subnets in spoke_address_space
        spoke_nw = ip_network(props.spoke_address_space)
        if spoke_nw.prefixlen < 24: # split evenly between subnets and hosts
            sub_diff = int((spoke_nw.max_prefixlen - spoke_nw.prefixlen) / 2)
        else:
            sub_diff = 27 - spoke_nw.prefixlen # minimum /27 subnet
        subnets = spoke_nw.subnets(prefixlen_diff=sub_diff)
        next_sn = next(subnets) # first subnet reserved for special uses
        first_sn = next_sn.subnets(new_prefix=27) # subdivide if possible
        abs_nw = next(first_sn) # AzureBastionSubnet /27 or greater

        # Azure Virtual Network to be peered to the hub
        spoke = vdc.virtual_network(name, [props.spoke_address_space])

        # VNet Peering from the hub to spoke
        hub_spoke = vdc.vnet_peering(
            stem = props.hub.stem,
            virtual_network_name = props.hub.name,
            peer = name,
            remote_virtual_network_id = spoke.id,
            allow_gateway_transit = True,
            depends_on=[props.hub.er_gw, props.hub.vpn_gw], # avoid contention
        )

        # VNet Peering from spoke to the hub
        spoke_hub = vdc.vnet_peering(
            stem = name,
            virtual_network_name = spoke.name,
            peer = props.hub.stem,
            remote_virtual_network_id = props.hub.id,
            allow_forwarded_traffic = True,
            use_remote_gateways = True, # requires at least one gateway
            depends_on=[props.hub.er_gw, props.hub.vpn_gw],
        )

        # add routes to spokes in peered stack
        if props.peer:
            peer_fw_ip = props.reference.get_output('fw_ip')
            peer_spoke_as = props.reference.get_output(f'{name}_address_spaces')
            #for address_prefix in peer_spoke_as:
            vdc.route_to_virtual_appliance(
                stem = f'fw-{props.peer}-{name}',
                route_table_name = props.fw_rt_name,
                address_prefix = peer_spoke_as[0], #address_prefix,
                next_hop_ip_address = peer_fw_ip,
            ) # only one address_space per spoke at present...

        # Azure Bastion subnet and host (optional)
        if props.azure_bastion:
            spoke_ab = vdc.bastion_host(
                stem = name,
                virtual_network_name = spoke.name,
                address_prefix = str(abs_nw),
                depends_on = [hub_spoke, spoke_hub], # avoid contention
            )

        # Route Table only to be associated with ordinary spoke subnets
        spoke_rt = vdc.route_table(
            stem = f'{name}',
            disable_bgp_route_propagation = True,
            depends_on = [hub_spoke, spoke_hub], # avoid contention
        )

        # VNet Peering may not be specified as next_hop_type, so a separate
        # hub address space from the firewall is necessary to allow routes
        # from spokes to remain unchanged when hub subnets are added

        # it is very important to ensure that there is never a route with an
        # address_prefix which covers the AzureFirewallSubnet.

        # partially or fully invalidate system routes to redirect traffic
        for route in [
            (f'dmz-{name}', props.hub.dmz_rt_name, props.spoke_address_space),
            (f'gw-{name}', props.hub.gw_rt_name, props.spoke_address_space),
            (f'ss-{name}', props.hub.ss_rt_name, props.spoke_address_space),
            (f'{name}-dg', spoke_rt.name, '0.0.0.0/0'),
            (f'{name}-dmz', spoke_rt.name, props.hub.dmz_ar),
            (f'{name}-hub', spoke_rt.name, props.hub.hub_as),
        ]:
            vdc.route_to_virtual_appliance(
                stem = route[0],
                route_table_name = route[1],
                address_prefix = route[2],
                next_hop_ip_address = props.hub.fw_ip,
            )

        # ordinary spoke subnets starting with the second subnet
        for subnet in props.subnets:
            next_sn = next(subnets)
            spoke_sn = vdc.subnet(
                stem = f'{name}-{subnet[0]}',
                virtual_network_name = spoke.name,
                address_prefix = str(next_sn),
                route_table_id = spoke_rt.id,
                depends_on = [spoke_rt], # avoid contention
            )

        # assign properties to spoke including from child resources
        self.address_space = spoke.address_space #exported
        self.hub = props.hub.id
        self.id = spoke.id # exported
        self.location = spoke.location
        self.name = spoke.name # exported
        self.resource_group_name = props.resource_group_name
        self.subnets = spoke.subnets
        self.stem = name
        self.tags = props.tags
        self.register_outputs({})
