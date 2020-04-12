from pulumi import Config, Output, ComponentResource, ResourceOptions
from pulumi.resource import CustomTimeouts
from pulumi_azure import core, network
from hub import Hub

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
    def __init__(self, name: str, props: SpokeProps, opts: ResourceOptions=None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # retrieve configuration
        dmz_ar = props.config.require('dmz_ar')
        hub_as = props.config.require('hub_as')
        hub_stem = props.config.require('hub_stem')
        sbs_ar = props.config.get('sbs_ar')
        spoke_ar = props.config.get('spoke_ar')
        spoke_as = props.config.require('spoke_as')

        # Azure Virtual Network to be peered to the hub
        spoke = network.VirtualNetwork(
            f"{name}-vn-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            address_spaces = [spoke_as],
            # avoid use of inline subnets (use standalone Subnet resource instead)
            # there should be no GatewaySubnet in the spokes but AzureBastionSubnet is OK
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # AzureBastionSubnet (optional)
        if sbs_ar:
            spoke_sbs_sn = network.Subnet( #ToDo add NSG if required
                f"{name}-ab-sn", # no trailing dash as not auto-named
                name = "AzureBastionSubnet", # specific physical name required            
                resource_group_name = props.resource_group.name,
                address_prefix = sbs_ar,
                virtual_network_name = spoke.name,
                opts = ResourceOptions(parent=self, delete_before_replace=True),
            )

        # VNet Peering from the hub to spoke
        hub_spoke = network.VirtualNetworkPeering(
            f"{hub_stem}-{name}-vnp-", # named after hub but child of the spoke
            resource_group_name = props.resource_group.name,
            virtual_network_name = props.hub.hub_name,
            remote_virtual_network_id = spoke.id,
            allow_gateway_transit = True,
            allow_virtual_network_access = True,
            opts = ResourceOptions(parent=self, custom_timeouts=CustomTimeouts(create='1h')),
        )

        # VNet Peering from spoke to the hub
        spoke_hub = network.VirtualNetworkPeering(
            f"{name}-{hub_stem}-vnp-",
            resource_group_name = props.resource_group.name,
            virtual_network_name = spoke.name,
            remote_virtual_network_id = props.hub.hub_id,
            allow_forwarded_traffic = True,
            use_remote_gateways = True, # a gateway must already be provisioned or this will fail
            allow_virtual_network_access = True,
            opts = ResourceOptions(parent=self, custom_timeouts=CustomTimeouts(create='1h')),
        )

        # Route table to be associated with all spoke subnets (except AzureBastionSubnet)
        spoke_sn_rt = network.RouteTable(
            f"{name}-sn-rt-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            disable_bgp_route_propagation = True, #use custom routes for subnets in spokes
            # avoid use of inline routes (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_spoke, spoke_hub], # reduce contention
            ),
        )

        # As many subnets as are required for application environments may be created in the spoke
        if spoke_ar: # replace with a loop
            spoke_example_sn = network.Subnet( #ToDo add NSGs for inter-subnet traffic in spoke
                f"{name}-example-sn-",
                resource_group_name = props.resource_group.name,
                address_prefix = spoke_ar,
                virtual_network_name = spoke.name,
                opts = ResourceOptions(parent=self),
            )
            # associate all spoke subnets (except AzureBastionSubnet) to the route table
            spoke_example_sn_rta = network.SubnetRouteTableAssociation(
                f"{name}-example-sn-rta", # no trailing dash as not auto-named
                route_table_id = spoke_sn_rt.id,
                subnet_id = spoke_example_sn.id,
                opts = ResourceOptions(parent=self),
            )

        # https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
        # Because it is not possible to specify the VNet Peering as next_hop_type, a separate 
        # address space for the firewall means that routes in the spokes don't need to be added
        # for every new subnet created in the hub. It is very important to ensure that there is
        # never a route with an address_prefix which covers the AzureFirewallSubnet.
        #ToDo check whether traffic to AzureFirewallManagementSubnet needs special treatment
  
        # override system route to redirect traffic from gateways to spoke via the firewall
        hub_gw_spoke_r = network.Route(
            f"{hub_stem}-gw-{name}-r-", # named after hub but child of the spoke
            resource_group_name = props.resource_group.name,
            address_prefix = spoke_as,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = props.hub.hub_gw_rt_name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # partially override system route to redirect traffic from spoke to DMZ via the firewall
        spoke_hub_dmz_r = network.Route(
            f"{name}-{hub_stem}-dmz-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = dmz_ar, # avoid overlapping AzureFirewallSubnet address space!
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = spoke_sn_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from DMZ to spoke via the firewall
        hub_dmz_spoke_r = network.Route(
            f"{hub_stem}-dmz-{name}-r-", # named after hub but child of the spoke
            resource_group_name = props.resource_group.name,
            address_prefix = spoke_as,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = props.hub.hub_dmz_rt_name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from spoke to hub via the firewall
        spoke_hub_sn_r = network.Route(
            f"{name}-{hub_stem}-sn-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = hub_as,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = spoke_sn_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from hub to spoke via the firewall
        hub_sn_spoke_r = network.Route(
            f"{hub_stem}-sn-{name}-r-", # named after hub but child of the spoke
            resource_group_name = props.resource_group.name,
            address_prefix = spoke_as,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = props.hub.hub_sn_rt_name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from hub to Internet via the firewall
        spoke_hub_dg_r = network.Route(
            f"{name}-{hub_stem}-dg-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = "0.0.0.0/0",
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = props.hub.hub_fw_ip,
            route_table_name = spoke_sn_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        self.spoke_name=spoke.name # exported
        self.spoke_id=spoke.id # exported
        self.spoke_subnets=spoke.subnets # exported
        self.register_outputs({})
