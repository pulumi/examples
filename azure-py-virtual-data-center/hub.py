from pulumi import Config, export, asset, Output, ComponentResource, ResourceOptions
from pulumi_azure import core, network

class HubArgs:
    def __init__(
        self,
        resource_group: core.ResourceGroup,
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
        self.dmz_ar = dmz_ar
        self.fws_ar = fws_ar
        self.fwz_as = fwz_as
        self.gws_ar = gws_ar
        self.hub_as = hub_as
        self.fwm_ar = fwm_ar
        self.hbs_ar = hbs_ar
        self.hub_ar = hub_ar


class Hub(ComponentResource):
    def __init__(self, name: str, args: HubArgs, opts: ResourceOptions = None):
        super().__init__('vdc:network:Hub', name, {}, opts)

        # 
        hub = network.VirtualNetwork(
            f"{name}-vn-", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            # separate firewall/DMZ address space to simplify custom routing
            address_spaces=[args.fwz_as, args.hub_as],
            # avoid use of inline subnets= (use standalone Subnet resource instead)
            opts=ResourceOptions(parent=self),
        )

        # DMZ subnet
        hub_dmz_sn = network.Subnet( #ToDo add NSG preventing access except via firewall
            f"{name}-dmz-sn", # no trailing dash as not auto-named
            name="DMZ", # specific physical name not required but preferred as treated specially
            resource_group_name=args.resource_group.name,
            address_prefix=args.dmz_ar,
            virtual_network_name=hub.name,
            opts=ResourceOptions(parent=self, delete_before_replace=True),
        )

        #AzureFirewallManagementSubnet (optional)
        if args.fwm_ar:
            hub_fwm_sn = network.Subnet(
                f"{name}-fwm-sn", # no trailing dash as not auto-named
                name="AzureFirewallManagementSubnet", # specific physical name required
                resource_group_name=args.resource_group.name,
                address_prefix=args.fwm_ar,
                virtual_network_name=hub.name,
                opts=ResourceOptions(parent=self, delete_before_replace=True),
            )

        # AzureFirewallSubnet
        hub_fw_sn = network.Subnet(
            f"{name}-fw-sn", # no trailing dash as not auto-named
            name="AzureFirewallSubnet", # specific physical name required
            resource_group_name=args.resource_group.name,
            address_prefix=args.fws_ar,
            virtual_network_name=hub.name,
            opts=ResourceOptions(parent=self, delete_before_replace=True),
        )

        # GatewaySubnet
        hub_gw_sn = network.Subnet(
            f"{name}-gw-sn", # no trailing dash as not auto-named
            name="GatewaySubnet", # specific physical name required
            resource_group_name=args.resource_group.name,
            address_prefix=args.gws_ar,
            virtual_network_name=hub.name,
            opts=ResourceOptions(parent=self, delete_before_replace=True),
        )

        # AzureBastionSubnet
        if args.hbs_ar:
            hub_ab_sn = network.Subnet( #ToDo add NSG if required
                f"{name}-ab-sn", # no trailing dash as not auto-named
                name="AzureBastionSubnet", # specific physical name required
                resource_group_name=args.resource_group.name,
                address_prefix=args.hbs_ar,
                virtual_network_name=hub.name,
                opts=ResourceOptions(parent=self, delete_before_replace=True),
            )

        # as many subnets as are required for shared services may be created in the hub
        if args.hub_ar:
            hub_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in hub
                f"{name}-example-sn-",
                resource_group_name=args.resource_group.name,
                address_prefix=args.hub_ar,
                virtual_network_name=hub.name,
                opts=ResourceOptions(parent=self),
            )

        # Public IP for the VPN Gateway
        hub_vpn_gw_pip = network.PublicIp(
            f"{name}-vpn-gw-pip-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            allocation_method="Dynamic",
            opts=ResourceOptions(parent=self),
        )

        # VPN Gateway
        hub_vpn_gw = network.VirtualNetworkGateway(
            f"{name}-vpn-gw-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            sku="VpnGw1",
            type="Vpn",
            vpn_type="RouteBased",
            ip_configurations=[{
                "name": f"{name}-vpn-gw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_gw_sn.id,
                "publicIpAddressId": hub_vpn_gw_pip.id
            }],
            opts=ResourceOptions(parent=self),
        )

        # Public IP for the ExpressRoute Gateway
        hub_er_gw_pip = network.PublicIp(
            f"{name}-er-gw-pip-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            allocation_method="Dynamic",
            opts=ResourceOptions(parent=self),
        )

        # ExpressRoute Gateway
        hub_er_gw = network.VirtualNetworkGateway(
            f"{name}-er-gw-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            sku="Standard",
            type="ExpressRoute",
            vpn_type="RouteBased",
            ip_configurations=[{
                "name": f"{name}-er-gw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_gw_sn.id,
                "publicIpAddressId": hub_er_gw_pip.id
            }],
            opts=ResourceOptions(parent=self),
        )

        # Public IP for the Azure Firewall
        hub_fw_pip = network.PublicIp(
            f"{name}-fw-pip-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            sku="Standard",
            allocation_method="Static",
            opts=ResourceOptions(parent=self),
        )

        # Azure Firewall
        hub_fw = network.Firewall(
            f"{name}-fw-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            ip_configurations=[{
                "name": f"{name}-fw-ipconf", # no trailing dash as not auto-named
                "subnet_id": hub_fw_sn.id,
                "publicIpAddressId": hub_fw_pip.id,
            }],
            opts=ResourceOptions(parent=self),
        )

        # work around https://github.com/pulumi/pulumi/issues/4040
        hub_fw_ip = hub_fw.ip_configurations.apply(lambda ipc: ipc[0].get('private_ip_address'))

        # route table to be associated with the GatewaySubnet only
        hub_gw_rt = network.RouteTable(
            f"{name}-gw-rt-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            disable_bgp_route_propagation=False, #use BGP for the gateway
            # avoid use of inline routes= (use standalone Route resource instead)
            opts=ResourceOptions(parent=self),
        )

        # associate GatewaySubnet with route table
        hub_gw_sn_rta = network.SubnetRouteTableAssociation(
            f"{name}-gw-sn-rta-",
            route_table_id=hub_gw_rt.id,
            subnet_id=hub_gw_sn.id,
            opts=ResourceOptions(parent=self),
        )

        # partially override system route to redirect traffic from gateways to DMZ via the firewall
        hub_gw_fw_dmz_r = network.Route(
            f"{name}-gw-fw-dmz-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.dmz_ar, # avoid including the AzureFirewallSubnet address space!
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_gw_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # override system route to redirect traffic from gateways to hub via the firewall
        hub_gw_fw_sn_r = network.Route(
            f"{name}-gw-fw-sn-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.hub_as, #ToDo this includes gateways, is this a problem?
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_gw_rt.name,
            opts=ResourceOptions(parent=self),
        )
        
        # route table to be associated with DMZ subnet only
        hub_dmz_rt = network.RouteTable(
            f"{name}-dmz-rt-",
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            disable_bgp_route_propagation=True, #use custom routes for the DMZ
            # avoid use of inline routes= (use standalone Route resource instead)
            opts=ResourceOptions(parent=self),
        )

        # associate DMZ subnet with route table
        hub_dmz_sn_rta = network.SubnetRouteTableAssociation(
            f"{name}-dmz-sn-rta-",
            route_table_id=hub_dmz_rt.id,
            subnet_id=hub_dmz_sn.id,
            opts=ResourceOptions(parent=self),
        )

        # partially override system route to redirect intra-DMZ traffic via the firewall
        hub_dmz_fw_dmz_r = network.Route(
            f"{name}-dmz-fw-dmz-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.dmz_ar,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_dmz_rt.name,
            opts=ResourceOptions(parent=self),
        )
        
        # partially override system route to redirect traffic from DMZ to hub via the firewall
        hub_dmz_fw_sn_r = network.Route(
            f"{name}-dmz-fw-sn-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.hub_as,
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_dmz_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # override the system route to redirect traffic from DMZ to Internet via the firewall
        hub_dmz_fw_dg_r = network.Route(
            f"{name}-dmz-fw-dg-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix="0.0.0.0/0",
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_dmz_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # route table to be associated with ordinary shared services subnets in the hub only
        hub_sn_rt = network.RouteTable(
            f"{name}-sn-rt-", 
            resource_group_name=args.resource_group.name,
            location=args.resource_group.location,
            disable_bgp_route_propagation=True, #use custom routes for ordinary subnets in hub
            # avoid use of inline routes= (use standalone Route resource instead)
            opts=ResourceOptions(parent=self),
        )

        # associate all hub shared services subnets to route table
        if args.hub_ar: # replace with a loop
            hub_example_sn_rta = network.SubnetRouteTableAssociation(
                f"{name}-example-sn-rta-",
                route_table_id=hub_sn_rt.id,
                subnet_id=hub_example_sn.id,
                opts=ResourceOptions(parent=self),
            )

        # partially override system route to redirect traffic from hub subnets to DMZ via the firewall
        hub_sn_fw_dmz_r = network.Route(
            f"{name}-sn-fw-dmz-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix=args.dmz_ar, # avoid including the AzureFirewallSubnet address space!
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_sn_rt.name,
            opts=ResourceOptions(parent=self),
        )

        # override the system route to redirect Internet traffic via the firewall
        hub_sn_fw_dg_r = network.Route(
            f"{name}-sn-fw-dg-r", # no trailing dash as not auto-named
            resource_group_name=args.resource_group.name,
            address_prefix="0.0.0.0/0",
            next_hop_type="VirtualAppliance",
            next_hop_in_ip_address=hub_fw_ip,
            route_table_name=hub_sn_rt.name,
            opts=ResourceOptions(parent=self),
        )

        combined_output = Output.all.Apply(
            name=hub.name,
            id=hub.id,
            fw_name=hub_fw.name,
            fw_ip=hub_fw_pip,
            fw_pip=hub_fw_pip.ip_address,
            er_gw_name=hub_er_gw.name,
            er_gw_pip=hub_er_gw_pip.ip_address,
            vpn_gw_name=hub_vpn_gw.name,
            vpn_gw_pip=hub_vpn_gw_pip.ip_address,
            gw_rt=hub_gw_rt.name,
            dmz_rt=hub_dmz_rt.name,
            sn_rt=hub_sn_rt.name,
        )
        self.register_outputs({})
