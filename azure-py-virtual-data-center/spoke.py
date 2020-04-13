from pulumi import Config, Output, ComponentResource, ResourceOptions
from pulumi_azure import core
from hub import Hub
import vdc

class SpokeProps:
    def __init__(
        self,
        config: Config,
        resource_group: core.ResourceGroup,
        tags: [str, str],
        hub: Hub,
    ):
        self.config = config
        self.resource_group = resource_group
        self.tags = tags
        self.hub = hub

class Spoke(ComponentResource):
    def __init__(self, name: str, props: SpokeProps,
            opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # retrieve configuration
        dmz_ar = props.config.require('dmz_ar')
        hub_as = props.config.require('hub_as')
        hub_stem = props.config.require('hub_stem')
        sbs_ar = props.config.get('sbs_ar')
        spoke_ar = props.config.get('spoke_ar')
        spoke_as = props.config.require('spoke_as')

        # set vdc defaults
        vdc.resource_group_name = props.resource_group.name
        vdc.location = props.resource_group.location
        vdc.tags = props.tags
        vdc.self = self

        # Azure Virtual Network to be peered to the hub
        spoke = vdc.virtual_network(name, [spoke_as])

        # AzureBastionSubnet (optional)
        if sbs_ar:
            spoke_sbs_sn = vdc.subnet_special(
                f'{name}-ab',
                'AzureBastionSubnet',
                spoke.name,
                sbs_ar,
            )

        # VNet Peering from the hub to spoke
        hub_spoke = vdc.vnet_peering(
            hub_stem,
            props.hub.hub_name,
            name,
            spoke.id,
            allow_gateway_transit=True,
        )

        # VNet Peering from spoke to the hub
        spoke_hub = vdc.vnet_peering(
            name,
            spoke.name,
            hub_stem,
            props.hub.hub_id,
            allow_forwarded_traffic=True,
            use_remote_gateways=True,
        )

        # Provisioning of routes depends_on VNet Peerings because of
        # contention in the Azure control plane that otherwise results

        # Route table only to be associated with ordinary spoke subnets
        spoke_sn_rt = vdc.route_table(
            f'{name}-sn',
            disable_bgp_route_propagation=True,
            depends_on=[hub_spoke, spoke_hub],
        )
                
        # Provisioning of subnets depends_on VNet Peerings and Route Table to
        # avoid contention in the Azure control plane

        # Only one spoke subnet is provisioned as an example, but many can be
        if spoke_ar: # replace with a loop
            spoke_example_sn = vdc.subnet(
                f'{name}-example',
                spoke.name,
                spoke_ar,
                depends_on=[spoke_sn_rt],
            )
            # associate all ordinary spoke subnets to the route table
            spoke_example_sn_rta = vdc.subnet_route_table(
                f'{name}-example',
                spoke_sn_rt.id,
                spoke_example_sn.id,
            )

        # As VNet Peering may not be specified as next_hop_type, a separate
        # address space in the hub from the firewall allows routes from the
        # spoke to remain unchanged when subnets are added in the hub

        # It is very important to ensure that there is never a route with an
        # address_prefix which covers the AzureFirewallSubnet.
        #ToDo check AzureFirewallManagementSubnet requirements
  
        # invalidate system route to spoke address space
        hub_gw_spoke_r = vdc.route_to_virtual_appliance(
            f'{hub_stem}-gw-{name}', # named after hub but child of spoke
            props.hub.hub_gw_rt_name,
            spoke_as,
            props.hub.hub_fw_ip,
        )

        # partially invalidate system route (excluding AzureFirewallSubnet)
        spoke_hub_dmz_r = vdc.route_to_virtual_appliance(
            f'{name}-{hub_stem}-dmz',
            spoke_sn_rt.name,
            dmz_ar,
            props.hub.hub_fw_ip,
        )
        
        # invalidate system route to spoke address space
        hub_dmz_spoke_r = vdc.route_to_virtual_appliance(
            f'{hub_stem}-dmz-{name}', # named after hub but child of spoke
            props.hub.hub_dmz_rt_name,
            spoke_as,
            props.hub.hub_fw_ip,
        )

        # invalidate system route to hub address space
        spoke_hub_r = vdc.route_to_virtual_appliance(
            f'{name}-{hub_stem}-hub',
            spoke_sn_rt.name,
            hub_as,
            props.hub.hub_fw_ip,
        )

        # invalidate system route to spoke address space
        hub_sn_spoke_r = vdc.route_to_virtual_appliance(
            f'{hub_stem}-sn-{name}', # named after hub but child of spoke
            props.hub.hub_sn_rt_name,
            spoke_as,
            props.hub.hub_fw_ip,
        )

        # invalidate system route to Internet
        spoke_hub_dg_r = vdc.route_to_virtual_appliance(
            f'{name}-{hub_stem}-dg',
            spoke_sn_rt.name,
            '0.0.0.0/0',
            props.hub.hub_fw_ip,
        )

        self.spoke_name=spoke.name # exported perhaps not needed
        self.spoke_id=spoke.id # exported as possibly needed
        self.spoke_subnets=spoke.subnets # exported as informational
        self.register_outputs({})
