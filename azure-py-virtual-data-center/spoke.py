from ipaddress import ip_network
from pulumi import ComponentResource, ResourceOptions
from hub import Hub
import vdc

class SpokeProps:
    def __init__(
        self,
        azure_bastion,
        hub: Hub,
        resource_group_name: str,
        spoke_address_space: str,
        subnets: [str, str, str],
        tags: [str, str],
    ):
        self.azure_bastion = azure_bastion
        self.hub = hub
        self.resource_group_name = resource_group_name
        self.spoke_address_space = spoke_address_space
        self.subnets = subnets
        self.tags = tags

class Spoke(ComponentResource):
    def __init__(self, name: str, props: SpokeProps,
            opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # set vdc defaults
        vdc.resource_group_name = props.resource_group_name
        vdc.tags = props.tags
        vdc.self = self

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

        # calculate the subnets in spoke_address_space
        spoke_nw = ip_network(props.spoke_address_space)
        pfl_diff = int((spoke_nw.max_prefixlen - spoke_nw.prefixlen) / 2)
        subnets = spoke_nw.subnets(prefixlen_diff=pfl_diff)
        next_sn = next(subnets) # first subnet reserved for special uses
        first_sn = next_sn.subnets(new_prefix=27) # for subdivision
        ab_nw = next(first_sn) # Azure Bastion subnet /27 or greater

        # provisioning of optional subnet and routes depends_on VNet Peerings
        # to avoid contention in the Azure control plane

        # AzureBastionSubnet (optional)
        if props.azure_bastion:
            spoke_ab_sn = vdc.subnet_special(
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet',
                virtual_network_name = spoke.name,
                address_prefix = str(ab_nw),
                depends_on = [hub_spoke, spoke_hub],
            )
            spoke_ab = vdc.bastion_host(
                stem = name,
                subnet_id = spoke_ab_sn.id,
            )

        # Route Table only to be associated with ordinary spoke subnets
        spoke_rt = vdc.route_table(
            stem = f'{name}',
            disable_bgp_route_propagation = True,
            depends_on = [hub_spoke, spoke_hub],
        )

        # as VNet Peering may not be specified as next_hop_type, a separate
        # address space in the hub from the firewall allows routes from the
        # spoke to remain unchanged when subnets are added in the hub

        # it is very important to ensure that there is never a route with an
        # address_prefix which covers the AzureFirewallSubnet.
        #ToDo check AzureFirewallManagementSubnet requirements

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
                next_hop_in_ip_address = props.hub.fw_ip,
            )
                
        # provisioning of subnets depends_on Route Table (VNet Peerings)
        # to avoid contention in the Azure control plane

        # ordinary spoke subnets starting with the second subnet
        next_sn = next(subnets)
        for subnet in props.subnets:
            spoke_sn = vdc.subnet(
                stem = f'{name}-{subnet[0]}',
                virtual_network_name = spoke.name,
                address_prefix = str(next_sn),
                depends_on = [spoke_rt],
            )
            # associate all ordinary spoke subnets to Route Table
            spoke_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-{subnet[0]}',
                route_table_id = spoke_rt.id,
                subnet_id = spoke_sn.id,
            )
            next_sn = next(subnets)

        # assign properties to spoke including from child resources
        self.address_spaces = spoke.address_spaces
        self.hub = props.hub.id
        self.id = spoke.id
        self.location = spoke.location
        self.name = spoke.name
        self.resource_group_name = props.resource_group_name
        self.subnets = spoke.subnets
        self.stem = name
        self.tags = props.tags
        self.register_outputs({})
