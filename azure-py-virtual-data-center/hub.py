from pulumi import Output, ComponentResource, ResourceOptions
from pulumi.resource import CustomTimeouts
from pulumi_azure import core, network

class HubProps:
    def __init__(
        self,
        resource_group: core.ResourceGroup,
        tags: [str, str],
        dmz_ar: str,
        fws_ar: str,
        fwz_as: str,
        gws_ar: str,
        hub_as: str,
        fwm_ar: str,
        hbs_ar: str,
        hub_ar: str,

    ):
        self.resource_group = resource_group
        self.tags = tags
        self.dmz_ar = dmz_ar
        self.fws_ar = fws_ar
        self.fwz_as = fwz_as
        self.gws_ar = gws_ar
        self.hub_as = hub_as
        self.fwm_ar = fwm_ar
        self.hbs_ar = hbs_ar
        self.hub_ar = hub_ar


class Hub(ComponentResource):
    def __init__(self, name: str, props: HubProps, opts: ResourceOptions=None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # Azure Virtual Network to which spokes are peered (not to each other)
        hub = network.VirtualNetwork(
            f"{name}-vn-", # no trailing dash as not auto-named
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            # separate firewall/DMZ address space to simplify custom routing
            address_spaces = [props.fwz_as, props.hub_as],
            # avoid use of inline subnets =  (use standalone Subnet resource instead)
            tags = props.tags,
            opts = ResourceOptions(parent=self),
        )

        # DMZ subnet
        hub_dmz_sn = network.Subnet( #ToDo add NSG preventing access except via firewall
            f"{name}-dmz-sn", # no trailing dash as not auto-named
            name = "DMZ", # specific physical name not required but preferred as treated specially
            resource_group_name = props.resource_group.name,
            address_prefix = props.dmz_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # AzureFirewallSubnet
        hub_fw_sn = network.Subnet(
            f"{name}-fw-sn", # no trailing dash as not auto-named
            name = "AzureFirewallSubnet", # specific physical name required
            resource_group_name = props.resource_group.name,
            address_prefix = props.fws_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        #AzureFirewallManagementSubnet (optional)
        if props.fwm_ar:
            hub_fwm_sn = network.Subnet(
                f"{name}-fwm-sn", # no trailing dash as not auto-named
                name = "AzureFirewallManagementSubnet", # specific physical name required
                resource_group_name = props.resource_group.name,
                address_prefix = props.fwm_ar,
                virtual_network_name = hub.name,
                opts = ResourceOptions(parent=self, delete_before_replace=True),
            )

        # GatewaySubnet
        hub_gw_sn = network.Subnet(
            f"{name}-gw-sn", # no trailing dash as not auto-named
            name = "GatewaySubnet", # specific physical name required
            resource_group_name = props.resource_group.name,
            address_prefix = props.gws_ar,
            virtual_network_name = hub.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # AzureBastionSubnet (optional)
        if props.hbs_ar:
            hub_ab_sn = network.Subnet( #ToDo add NSG if required
                f"{name}-ab-sn", # no trailing dash as not auto-named
                name = "AzureBastionSubnet", # specific physical name required
                resource_group_name = props.resource_group.name,
                address_prefix = props.hbs_ar,
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
                depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn],
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
            opts = ResourceOptions(parent=self, depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn]),
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
            opts = ResourceOptions(parent=self, depends_on=[hub_dmz_sn, hub_fw_sn, hub_gw_sn]),
        )

        # work around https://github.com/pulumi/pulumi/issues/4040
        hub_fw_ip = hub_fw.ip_configurations.apply(lambda ipc: ipc[0].get('private_ip_address'))

        # route table to be associated with the GatewaySubnet only
        hub_gw_rt = network.RouteTable(
            f"{name}-gw-rt-",
            resource_group_name = props.resource_group.name,
            location = props.resource_group.location,
            disable_bgp_route_propagation = False, #use BGP for the gateway
            # avoid use of inline routes =  (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(parent=self, depends_on=[hub_vpn_gw, hub_er_gw, hub_fw]),
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
            address_prefix = props.dmz_ar, # avoid including the AzureFirewallSubnet address space!
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_gw_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # ensure that traffic within the gateway subnet is not redirected to the firewall
        hub_gw_gw_r = network.Route(
            f"{name}-gw-gw-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = props.gws_ar,
            next_hop_type = "VnetLocal", # because gateways are in hub address space
            route_table_name = hub_gw_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )

        # override system route to redirect traffic from gateways to hub via the firewall
        hub_gw_sn_r = network.Route(
            f"{name}-gw-sn-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = props.hub_as, # lower priority than shorter gateway prefix above
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
            # avoid use of inline routes =  (use standalone Route resource instead)
            tags = props.tags,
            opts = ResourceOptions(parent=self, depends_on=[hub_vpn_gw, hub_er_gw, hub_fw]),
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
            address_prefix = props.dmz_ar,
            next_hop_type = "VirtualAppliance",
            next_hop_in_ip_address = hub_fw_ip,
            route_table_name = hub_dmz_rt.name,
            opts = ResourceOptions(parent=self, delete_before_replace=True),
        )
        
        # partially override system route to redirect traffic from DMZ to hub via the firewall
        hub_dmz_sn_r = network.Route(
            f"{name}-dmz-sn-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = props.hub_as,
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
            opts = ResourceOptions(parent=self, depends_on=[hub_vpn_gw, hub_er_gw, hub_fw]),
        )

        # partially override system route to redirect traffic from hub subnets to DMZ via the firewall
        hub_sn_dmz_r = network.Route(
            f"{name}-sn-dmz-r-",
            resource_group_name = props.resource_group.name,
            address_prefix = props.dmz_ar, # avoid including the AzureFirewallSubnet address space!
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

        # as many subnets as are required for shared services may be created in the hub
        if props.hub_ar: # replace with loop
            hub_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in hub
                f"{name}-example-sn-",
                resource_group_name = props.resource_group.name,
                address_prefix = props.hub_ar,
                virtual_network_name = hub.name,
                opts = ResourceOptions(parent=self, depends_on=[hub_sn_rt]),
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
        self.hub_gw_rt_name = hub_gw_rt.name # used to construct routes to spokes
        self.hub_dmz_rt_name = hub_dmz_rt.name # used to construct routes to spokes
        self.hub_sn_rt_name = hub_sn_rt.name # used to construct routes to spokes
        self.register_outputs({})
