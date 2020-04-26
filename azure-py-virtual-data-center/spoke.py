from pulumi import ComponentResource, ResourceOptions
from hub import Hub
import vdc

class SpokeProps:
    def __init__(
        self,
        resource_group_name: str,
        tags: [str, str],
        hub: Hub,
        sbs_ar: str,
        spoke_ar: str,
        spoke_as: str,
        subnets: [str, str, str]
    ):
        self.resource_group_name = resource_group_name
        self.tags = tags
        self.hub = hub
        self.sbs_ar = sbs_ar
        self.spoke_ar = spoke_ar
        self.spoke_as = spoke_as
        self.subnets = subnets

class Spoke(ComponentResource):
    def __init__(self, name: str, props: SpokeProps,
            opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # set vdc defaults
        vdc.resource_group_name = props.resource_group_name
        vdc.tags = props.tags
        vdc.self = self

        # Azure Virtual Network to be peered to the hub
        spoke = vdc.virtual_network(name, [props.spoke_as])

        # VNet Peering from the hub to spoke
        hub_spoke = vdc.vnet_peering(
            stem = props.hub.stem,
            virtual_network_name = props.hub.name,
            peer = name,
            remote_virtual_network_id = spoke.id,
            allow_gateway_transit = True,
            depends_on=[props.hub.er_gw, props.hub.vpn_gw] # avoid contention
        )

        # VNet Peering from spoke to the hub
        spoke_hub = vdc.vnet_peering(
            stem = name,
            virtual_network_name = spoke.name,
            peer = props.hub.stem,
            remote_virtual_network_id = props.hub.id,
            allow_forwarded_traffic = True,
            use_remote_gateways = True, # requires at least one gateway
            depends_on=[props.hub.er_gw, props.hub.vpn_gw]
        )

        # provisioning of optional subnet and routes depends_on VNet Peerings
        # to avoid contention in the Azure control plane

        # AzureBastionSubnet (optional)
        if props.sbs_ar:
            spoke_sbs_sn = vdc.subnet_special(
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet',
                virtual_network_name = spoke.name,
                address_prefix = props.sbs_ar,
                depends_on = [hub_spoke, spoke_hub],
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
            (f'dmz-{name}', props.hub.dmz_rt_name, props.spoke_as),
            (f'gw-{name}', props.hub.gw_rt_name, props.spoke_as),
            (f'ss-{name}', props.hub.ss_rt_name, props.spoke_as),
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

        # ordinary spoke subnets
        subnet_range = props.spoke_ar
        for subnet in props.subnets:
            spoke_sn = vdc.subnet(
                stem = f'{name}-{subnet[0]}',
                virtual_network_name = spoke.name,
                address_prefix = subnet_range,
                depends_on = [spoke_rt],
            )
            # associate all ordinary spoke subnets to Route Table
            spoke_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-{subnet[0]}',
                route_table_id = spoke_rt.id,
                subnet_id = spoke_sn.id,
            )
            subnet_range = vdc.subnet_next(props.spoke_as, subnet_range)

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
