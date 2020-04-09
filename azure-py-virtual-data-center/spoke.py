from pulumi import Config, export, asset, Output, ComponentResource, ResourceOptions
from pulumi_azure import core, network

class SpokeArgs:
    def __init__(
        self,
        resource_group: core.ResourceGroup,
        dmz_ar: str,
        spoke_as: str,
        hub_name: str,
        hub_id: str,
        fw_ip: str,
        hub_gw_rt_name: str,
        hub_dmz_rt_name: str,
        hub_sn_rt_name: str,
        sbs_ar: str,
        spoke_ar: str,
    ):
        self.resource_group = resource_group
        self.dmz_ar
        self.spoke_as
        self.hub_name
        self.hub_id
        self.fw_ip
        self.hub_gw_rt_name
        self.hub_dmz_rt_name
        self.hub_sn_rt_name
        self.sbs_ar
        self.spoke_ar

class Spoke(ComponentResource):
    def __init__(self, name:str, args: SpokeArgs, opts: ResourceOptions = None):
        super().__init__('vdc:network:Spoke', name, {}, opts)

        # Azure Virtual Network intended for application environments
        spoke = network.VirtualNetwork(
            f"{name}-vn-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            address_spaces=[args.hub_as],
            # avoid use of inline subnets= (use standalone Subnet resource instead)
            # there should be no GatewaySubnet in the spokes but AzureBastionSubnet is OK
            opts=ResourceOptions(parent=self),
        )

        # AzureBastionSubnet (optional)
        if args.sbs_ar:
            spoke_sbs_sn = network.Subnet( #ToDo add NSG if required
                f"{name}-ab-sn", # no trailing dash as not auto-named
                name="AzureBastionSubnet", # specific physical name required            
                resource_group_name=args.resource_group.name,
                address_prefix=args.sbs_ar,
                virtual_network_name=spoke.name,
                opts=ResourceOptions(parent=self, delete_before_replace=True),
            )

        # As many subnets as are required for application environments may be created in the spoke
        if args.spoke_ar: # replace with a loop
            spoke_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in spoke
                f"{name}-example-sn-",
                resource_group_name=args.resource_group.name,
                address_prefix=args.spoke_ar,
                virtual_network_name=spoke.name,
                opts=ResourceOptions(parent=self),
            )

        # VNet Peering from the hub to spoke
        hub_spoke = network.VirtualNetworkPeering(
            f"hub-{name}-vnp-",
            resource_group_name=args.resource_group.name,
            virtual_network_name=args.hub_name,
            remote_virtual_network_id=spoke.id,
            allow_gateway_transit=True,
            allow_virtual_network_access=True,
            opts=ResourceOptions(parent=self),
        )

        # VNet Peering from spoke to the hub
        spoke_hub = network.VirtualNetworkPeering(
            f"{name}-hub-vnp-",
            resource_group_name=args.resource_group.name,
            virtual_network_name=spoke.name,
            remote_virtual_network_id=args.hub_id,
            allow_forwarded_traffic=True,
            use_remote_gateways=True, # a gateway must be provisioned already or this will fail
            allow_virtual_network_access=True,
            opts=ResourceOptions(parent=self), # an individual resource in another component
        )

        # https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
        # because it is not possible to specify the VNet Peering as next_hop_type, ensure that
        # there is no route with an address_prefix which covers the AzureFirewallSubnet
        #ToDo check whether traffic to AzureFirewallManagementSubnet needs special treatment
  
        # Route table to be associated with all spoke subnets
        spoke_sn_rt = network.RouteTable(
            f"{name}-sn-rt-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            disable_bgp_route_propagation=True, #use custom routes for subnets in spokes
            # avoid use of inline routes= (use standalone Route resource instead)
            opts=ResourceOptions(parent=self),
        )

        # Associate all spoke subnets to route table
        if args.spoke_ar: # replace with a loop
            spoke_example_sn_rta = network.SubnetRouteTableAssociation(
                f"{name}-example-sn-rta-",
                route_table_id=spoke_sn_rt.id,
                subnet_id=spoke_example_sn.id,
                opts=ResourceOptions(parent=self),
            )
    
        # override system route to redirect traffic from gateways to spoke via the firewall
        hub_gw_fw_spoke_r = network.Route(
            f"hub-gw-fw-{name}-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.spoke_as,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=args.hub_gw_rt_name,
            opts=ResourceOptions(parent=self), # an individual resource in another component
        )

        # partially override system route to redirect traffic from spoke to DMZ via the firewall
        spoke_hub_fw_dmz_r = network.Route(
            f"{name}-hub-fw-dmz-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.dmz_ar,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=spoke_sn_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # override system route to redirect traffic from DMZ to spoke via the firewall
        hub_dmz_fw_spoke_r = network.Route(
            f"hub-dmz-fw-{name}-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.spoke_as,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=args.hub_dmz_rt_name,
            opts=ResourceOptions(parent=self), # an individual resource in another component
        )

        # override system route to redirect traffic from spoke to hub via the firewall
        spoke_hub_fw_sn_r = network.Route(
            f"{name}-hub-fw-sn-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.hub_as,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=spoke_sn_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # override system route to redirect traffic from hub to spoke via the firewall
        hub_sn_fw_spoke_r = network.Route(
            f"hub-sn-fw-{name}-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.spoke_as,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=args.hub_sn_rt_name,
            opts=ResourceOptions(parent=self), # an individual resource in another component
        )

        # override system route to redirect traffic from hub to Internet via the firewall
        spoke_hub_fw_dg_r = network.Route(
            f"{name}-hub-fw-dg-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix="0.0.0.0/0",
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=args.fw_ip,
            route_table_name=spoke_sn_rt.name,
            opts=ResourceOptions(parent=self),
        )
