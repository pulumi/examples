from pulumi import Config, Output, ComponentResource, ResourceOptions
from hub import Hub
import vdc

class SpokeProps:
    def __init__(
        self,
        resource_group_name: str,
        tags: [str, str],
        hub: Hub,
        config: Config,
    ):
        self.resource_group_name = resource_group_name
        self.tags = tags
        self.hub = hub
        self.config = config

class Spoke(ComponentResource):
    def __init__(self, name: str, props: SpokeProps,
            opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # retrieve configuration for spoke
        dmz_ar = props.config.require('dmz_ar')
        hub_as = props.config.require('hub_as')
        sbs_ar = props.config.get('sbs_ar')
        spoke_ar = props.config.get('spoke_ar')
        spoke_as = props.config.require('spoke_as')

        # set vdc defaults
        vdc.resource_group_name = props.resource_group_name
        vdc.tags = props.tags
        vdc.self = self

        # Azure Virtual Network to be peered to the hub
        spoke = vdc.virtual_network(name, [spoke_as])

        # VNet Peering from the hub to spoke
        hub_spoke = vdc.vnet_peering(
            stem = props.hub.stem,
            virtual_network_name = props.hub.name,
            peer = name,
            remote_virtual_network_id = spoke.id,
            allow_gateway_transit = True,
        )

        # VNet Peering from spoke to the hub
        spoke_hub = vdc.vnet_peering(
            stem = name,
            virtual_network_name = spoke.name,
            peer = props.hub.stem,
            remote_virtual_network_id = props.hub.id,
            allow_forwarded_traffic = True,
            use_remote_gateways = True, # requires gateway(s)
            depends_on=[props.hub.er_gw, props.hub.vpn_gw]
        )

        # provisioning of optional subnet and routes depends_on VNet Peerings
        # to avoid contention in the Azure control plane

        # AzureBastionSubnet (optional)
        if sbs_ar:
            spoke_sbs_sn = vdc.subnet_special(
                stem = f'{name}-ab',
                name = 'AzureBastionSubnet',
                virtual_network_name = spoke.name,
                address_prefix = sbs_ar,
                depends_on = [hub_spoke, spoke_hub],
            )

        # Route Table only to be associated with ordinary spoke subnets
        spoke_rt = vdc.route_table(
            stem = f'{name}',
            disable_bgp_route_propagation = True,
            depends_on = [hub_spoke, spoke_hub],
        )
                
        # provisioning of subnets depends_on VNet Peerings and Route Table
        # to avoid contention in the Azure control plane

        # only one spoke subnet is provisioned as an example, but many can be
        if spoke_ar: # replace with a loop
            spoke_example_sn = vdc.subnet(
                stem = f'{name}-example',
                virtual_network_name = spoke.name,
                address_prefix = spoke_ar,
                depends_on = [spoke_rt],
            )
            # associate all ordinary spoke subnets to Route Table
            spoke_example_sn_rta = vdc.subnet_route_table(
                stem = f'{name}-example',
                route_table_id = spoke_rt.id,
                subnet_id = spoke_example_sn.id,
            )

        # as VNet Peering may not be specified as next_hop_type, a separate
        # address space in the hub from the firewall allows routes from the
        # spoke to remain unchanged when subnets are added in the hub

        # it is very important to ensure that there is never a route with an
        # address_prefix which covers the AzureFirewallSubnet.
        #ToDo check AzureFirewallManagementSubnet requirements

        # partially or fully invalidate system routes to redirect traffic
        for route in [
            (f'dmz-{name}', props.hub.dmz_rt_name, spoke_as),
            (f'gw-{name}', props.hub.gw_rt_name, spoke_as),
            (f'ss-{name}', props.hub.ss_rt_name, spoke_as),
            (f'{name}-dg', spoke_rt.name, '0.0.0.0/0'),
            (f'{name}-dmz', spoke_rt.name, dmz_ar),
            (f'{name}-hub', spoke_rt.name, hub_as),
        ]:
            vdc.route_to_virtual_appliance(
                stem = route[0],
                route_table_name = route[1],
                address_prefix = route[2],
                next_hop_in_ip_address = props.hub.fw_ip,
            )

        # assign properties to spoke including from child resources
        self.address_spaces = spoke.address_spaces # informational
        self.id = spoke.id # informational
        self.location = spoke.location # informational
        self.name = spoke.name # informational
        self.subnets = spoke.subnets # informational
        self.stem = name # informational
        self.register_outputs({})
