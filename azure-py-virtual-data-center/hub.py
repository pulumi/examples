from pulumi import Config, Output, ComponentResource, ResourceOptions, get_project, StackReference
from pulumi.resource import CustomTimeouts
from pulumi_azure import core, network

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

        # Azure Virtual Network to which spokes will be peered
        hub = network.VirtualNetwork(
            f"{name}-vn-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            # separate address spaces to simplify custom routing
            address_spaces = [fwz_as, hub_as],
            # avoid use of inline subnets (use standalone Subnet resource instead)
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # DMZ subnet
        hub_dmz_sn = network.Subnet( #ToDo add NSG preventing access except via firewall
            f"{name}-dmz-sn", # no trailing dash as not auto-named
            name = "DMZ", # specific physical name not required but preferred for clarity
            resource_group_name = props.resource_group.name,
            address_prefix = dmz_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # AzureFirewallSubnet
        hub_fw_sn = network.Subnet(
            f"{name}-fw-sn", # no trailing dash as not auto-named
            name = "AzureFirewallSubnet", # specific physical name required
            resource_group_name = props.resource_group.name,
            address_prefix = fws_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        #AzureFirewallManagementSubnet (optional)
        if fwm_ar:
            hub_fwm_sn = network.Subnet(
                f"{name}-fwm-sn", # no trailing dash as not auto-named
                name = "AzureFirewallManagementSubnet", # specific physical name required
                resource_group_name = props.resource_group.name,
                address_prefix = fwm_ar,
                virtual_network_name = hub.name,
                opts = ResourceOptions(parent=self, delete_before_replace=True),
            )

        # GatewaySubnet
        hub_gw_sn = network.Subnet(
            f"{name}-gw-sn", # no trailing dash as not auto-named
            name = "GatewaySubnet", # specific physical name required
            resource_group_name = props.resource_group.name,
            address_prefix = gws_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # AzureBastionSubnet (optional)
        if hbs_ar:
            hub_ab_sn = network.Subnet( #ToDo add NSG if required
                f"{name}-ab-sn", # no trailing dash as not auto-named
                name = "AzureBastionSubnet", # specific physical name required
                resource_group_name = props.resource_group.name,
                address_prefix = hbs_ar,
                virtual_network_name = hub.name,
                opts = ResourceOptions(parent=self, delete_before_replace=True),
            )

        # Public IP for the VPN Gateway
        hub_vpn_gw_pip = network.PublicIp(
            f"{name}-vpn-gw-pip-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            allocation_method = "Dynamic",
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # VPN Gateway
        hub_vpn_gw = network.VirtualNetworkGateway(
            f"{name}-vpn-gw-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            sku = "VpnGw1",
            type = "Vpn",
            vpn_type = "RouteBased",
            ip_configurations = [{
                "name": f"{name}-vpn-gw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_gw_sn.id,
                "publicIpAddressId": hub_vpn_gw_pip.id
            }],
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn], # reduce contention
                custom_timeouts=CustomTimeouts(create='1h'),
            ),
        )

        # Public IP for the ExpressRoute Gateway
        hub_er_gw_pip = network.PublicIp(
            f"{name}-er-gw-pip-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            allocation_method = "Dynamic",
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # ExpressRoute Gateway
        hub_er_gw = network.VirtualNetworkGateway(
            f"{name}-er-gw-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            sku = "Standard",
            type = "ExpressRoute",
            vpn_type = "RouteBased",
            ip_configurations = [{
                "name": f"{name}-er-gw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_gw_sn.id,
                "publicIpAddressId": hub_er_gw_pip.id
            }],
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn], # reduce contention
            ),
        )

        # Public IP for the Azure Firewall
        hub_fw_pip = network.PublicIp(
            f"{name}-fw-pip-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            sku = "Standard",
            allocation_method = "Static",
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # Azure Firewall
        hub_fw = network.Firewall(
            f"{name}-fw-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            ip_configurations = [{
                "name": f"{name}-fw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_fw_sn.id,
                "publicIpAddressId": hub_fw_pip.id,
            }],
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn], # reduce contention
            ),
        )

        # work around https://github.com/pulumi/pulumi/issues/4040
        hub_fw_ip = hub_fw.ip_configurations.apply(lambda ipc: ipc[0].get('private_ip_address'))

        # route table to be associated with the GatewaySubnet only
        hub_gw_rt = network.RouteTable(
            f"{name}-gw-rt-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            disable_bgp_route_propagation = False, #use BGP for the gateway
            # avoid use of inline routes (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_vpn_gw, hub_er_gw, hub_fw], # reduce contention
            ),
        )

        # associate GatewaySubnet with route table
        hub_gw_sn_rta = network.SubnetRouteTableAssociation(
            f"{name}-gw-sn-rta", # no trailing dash as not auto-named
            route_table_id = hub_gw_rt.id,
            subnet_id = hub_gw_sn.id,
            opts = ResourceOptions(parent=self),
        )

        # partially override system route to redirect traffic from gateways to DMZ via the firewall
        hub_gw_dmz_r = network.Route(
            f"{name}-gw-dmz-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = dmz_ar, # avoid overlapping AzureFirewallSubnet address space!
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_gw_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # ensure that traffic within the gateway subnet is not redirected to the firewall
        hub_gw_gw_r = network.Route(
            f"{name}-gw-gw-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = gws_ar, # partially override the following route to hub_as
            next_hop_type = "VnetLocal", # intra GatewaySubnet traffic not to be redirected
            route_table_name = hub_gw_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from gateways to hub via the firewall
        hub_gw_sn_r = network.Route(
            f"{name}-gw-sn-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = hub_as, # overlaps the shorter gateway prefix gws_ar above
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_gw_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )
        
        # route table to be associated with DMZ subnet only
        hub_dmz_rt = network.RouteTable(
            f"{name}-dmz-rt-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            disable_bgp_route_propagation = True, #use custom routes for the DMZ
            # avoid use of inline routes (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_vpn_gw, hub_er_gw, hub_fw], # reduce contention
            ),
        )

        # associate DMZ subnet with route table
        hub_dmz_sn_rta = network.SubnetRouteTableAssociation(
            f"{name}-dmz-sn-rta", # no trailing dash as not auto-named
            route_table_id = hub_dmz_rt.id,
            subnet_id = hub_dmz_sn.id,
            opts = ResourceOptions(parent=self),
        )

        # partially override system route to redirect intra-DMZ traffic via the firewall
        hub_dmz_dmz_r = network.Route(
            f"{name}-dmz-dmz-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = dmz_ar, # avoid overlapping AzureFirewallSubnet address space!
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_dmz_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )
        
        # partially override system route to redirect traffic from DMZ to hub via the firewall
        hub_dmz_sn_r = network.Route(
            f"{name}-dmz-sn-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = hub_as,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_dmz_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override the system route to redirect traffic from DMZ to Internet via the firewall
        hub_dmz_dg_r = network.Route(
            f"{name}-dmz-dg-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = "0.0.0.0/0",
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_dmz_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # route table to be associated with ordinary shared services subnets in the hub only
        hub_sn_rt = network.RouteTable(
            f"{name}-sn-rt-", 
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            disable_bgp_route_propagation = True, #use custom routes for ordinary subnets in hub
            # avoid use of inline routes =  (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(
                parent=self,
                depends_on=[hub_vpn_gw, hub_er_gw, hub_fw], # reduce contention
            ),
        )

        # partially override system route to redirect traffic from hub subnets to DMZ via the firewall
        hub_sn_dmz_r = network.Route(
            f"{name}-sn-dmz-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = dmz_ar, # avoid overlapping AzureFirewallSubnet address space!
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_sn_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override the system route to redirect Internet traffic via the firewall
        hub_sn_dg_r = network.Route(
            f"{name}-sn-dg-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = "0.0.0.0/0",
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_sn_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # VNet Peering between hubs in different stacks (Global if different regions)
        peer = props.config.get('peer')
        if peer:
            org = props.config.require('org')
            project = get_project()
            peer_stack = StackReference(f"{org}/{project}/{peer}")
            peer_hub_id = peer_stack.get_output("hub_id")
            hub_hub = network.VirtualNetworkPeering( # need corresponding peering as well
                f"{props.stack}-{peer}-vnp-",
                resource_group_name = props.resource_group.name,
                virtual_network_name = hub.name,
                remote_virtual_network_id = peer_hub_id,
                allow_forwarded_traffic = True,
                allow_gateway_transit = False, # both hubs have gateways so not possible
                allow_virtual_network_access = True,
                opts = ResourceOptions(parent=self),
            ) #ToDo add routes to override system routes created for the new peerings
            # Still need to control access to the other DMZ and hub, need the following:
            # peer_fw_ip = 
            # peer_dmz_ar = 
            # peer_hub_as = 
            # Don't need to worry about spokes as peering isn't transitive

        # as many subnets as are required for shared services may be created in the hub
        if hub_ar: # replace with loop
            hub_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in hub
                f"{name}-example-sn-",
                resource_group_name = props.resource_group.name,
                address_prefix = hub_ar,
                virtual_network_name = hub.name,
                opts = ResourceOptions(parent=self, depends_on=[hub_sn_rt]), # reduce contention
            )
            # associate all hub shared services subnets to route table        
            hub_example_sn_rta = network.SubnetRouteTableAssociation(
                f"{name}-example-sn-rta", # no trailing dash as not auto-named
                route_table_id = hub_sn_rt.id,
                subnet_id = hub_example_sn.id,
                opts = ResourceOptions(parent=self),
            )

        self.hub_name = hub.name # exported
        self.hub_id = hub.id # exported
        self.hub_subnets = hub.subnets # exported
        self.hub_er_gw = hub_er_gw # depended on for VNet Peering from spokes
        self.hub_vpn_gw = hub_vpn_gw # depended on for VNet Peering from spokes
        self.hub_fw_ip = hub_fw_ip # used to construct routes from spokes
        self.hub_gw_rt_name = hub_gw_rt.name # used to add routes to spokes
        self.hub_dmz_rt_name = hub_dmz_rt.name # used to add routes to spokes
        self.hub_sn_rt_name = hub_sn_rt.name # used to add routes to spokes
        self.register_outputs({})
