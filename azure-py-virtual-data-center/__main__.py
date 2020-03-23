import pulumi
from pulumi_azure import core, network

# Retrieve the configuration data
config = pulumi.Config()
dmz_ap = config.require('dmz_ap')
fw_ap = config.require('fw_ap')
fw_as = config.require('fw_as')
fwm_ap = config.require('fwm_ap')
gw_ap = config.require('gw_ap')
hub_as = config.require('hub_as')
hub_ap = config.require('hub_ap')
spoke1_as = config.require('spoke1_as')
spoke1_ap = config.require('spoke1_ap')

# Create an Azure Resource Group using the location in the stack configuration
resource_group = core.ResourceGroup("vdc-rg-")

# Create a hub VNet which will contain gateway, firewall, DMZ and an example subnet
hub = network.VirtualNetwork(
    "hub-vn-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    # separate firewall/DMZ address space to simplify custom routing as subnets are added
    address_spaces=[fw_as,hub_as]
    # avoid use of subnets= (use standalone Subnet resource instead)
)

hub_gw_sn = network.Subnet(
    "hub-gw-sn",
    name="GatewaySubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=gw_ap,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_vpn_gw_pip = network.PublicIp(
    "hub-vpn-gw-pip-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    allocation_method="Dynamic"
)

hub_vpn_gw = network.VirtualNetworkGateway(
    "hub-vpn-gw-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku="VpnGw1",
    type="Vpn",
    vpn_type="RouteBased",
    ip_configurations=[{
        "name": "hub-vpn-gw-ipconf",
        "subnet_id": hub_gw_sn.id,
        "publicIpAddressId": hub_vpn_gw_pip.id
    }]
)

hub_er_gw_pip = network.PublicIp(
    "hub-er-gw-pip-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    allocation_method="Dynamic"
)

hub_er_gw = network.VirtualNetworkGateway(
    "hub-er-gw-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku="Standard",
    type="ExpressRoute",
    vpn_type="RouteBased",
    ip_configurations=[{
        "name": "hub-er-gw-ipconf",
        "subnet_id": hub_gw_sn.id,
        "publicIpAddressId": hub_er_gw_pip.id
    }]
)

hub_fw_sn = network.Subnet(
    "hub-fw-sn",
    name="AzureFirewallSubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=fw_ap,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_fwm_sn = network.Subnet(
    "hub-fwm-sn",
    name="AzureFirewallManagementSubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=fwm_ap,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_fw_pip = network.PublicIp(
    'hub-fw-pip-',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku="Standard",
    allocation_method="Static"
)

hub_fw = network.Firewall( #ToDo output the firewall private IP for use in routing tables
    "hub-fw-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    ip_configurations=[{
        "name": "hub-fw-ipconf",
        "subnet_id": hub_fw_sn.id,
        "publicIpAddressId": hub_fw_pip.id
    }]
)

hub_dmz_sn = network.Subnet( #ToDo add NSG preventing access except via firewall
    "hub-dmz-sn",
    name="DMZ", # specific physical name not required but preferred due to special routing for DMZ
    resource_group_name=resource_group.name,
    address_prefix=dmz_ap,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_example_sn = network.Subnet( #ToDo add NSG
    "hub-example-sn-",
    resource_group_name=resource_group.name,
    address_prefix=hub_ap,
    virtual_network_name=hub.name
)

# Create a spoke virtual network (additional spokes may be modelled on this)
spoke1 = network.VirtualNetwork(
    "spoke1-vn-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    address_spaces=[spoke1_as]
    # avoid use of subnets= (use standalone Subnet resource instead)
    # there should be no GatewaySubnet in the spokes
)

spoke1_example_sn = network.Subnet( #ToDo add NSG
    "spoke1-example-sn-",
    resource_group_name=resource_group.name,
    address_prefix=spoke1_ap,
    virtual_network_name=spoke1.name
)

# Create a VNet Peering from the hub to spoke (additional spokes require similar)
hub_spoke1 = network.VirtualNetworkPeering(
    "hub-spoke1-vnp-",
    resource_group_name=resource_group.name,
    virtual_network_name=hub.name,
    remote_virtual_network_id=spoke1.id,
    allow_gateway_transit=True,
    allow_virtual_network_access=True
)

# Create a VNet Peering from spoke to the hub (future spokes require similar)
spoke1_hub = network.VirtualNetworkPeering(
    "spoke1-hub-vnp-",
    resource_group_name=resource_group.name,
    virtual_network_name=spoke1.name,
    remote_virtual_network_id=hub.id,
    allow_forwarded_traffic=True,
    use_remote_gateways=True, #ToDo add dependency on gateway in the hub
    allow_virtual_network_access=True
)

# Custom routes to direct all traffic between virtual networks through the firewall
hub_gw_rt = network.RouteTable(
    "hub-gw-rt-", # only to be associated with GatewaySubnet
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=False, #use BGP for the gateway
    routes=[{
        # partially override VnetLocal to redirect traffic to DMZ via the firewall
        # (be careful to not override the AzureFirewallSubnet address space)
        "name": "hub-gw-fw-dmz-r",
        "address_prefix": dmz_ap,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override VNetLocal to redirect other hub subnet traffic via the firewall
        "name": "hub-gw-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-gw-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    }]
)

# Associate GatewaySubnet and route table
hub_gw_sn_rta = network.SubnetRouteTableAssociation(
    "hub-gw-sn-rta-",
    route_table_id=hub_gw_rt.id,
    subnet_id=hub_gw_sn.id
)

hub_dmz_rt = network.RouteTable(
    "hub-dmz-rt-", # to be associated with DMZ subnet
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=True, #use custom routes for the DMZ
    routes=[{
        # partially override VnetLocal to redirect intra-DMZ traffic via the firewall
        "name": "hub-dmz-fw-dmz-r",
        "address_prefix": dmz_ap,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # partially override VnetLocal to redirect hub traffic via the firewall
        "name": "hub-dmz-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-dmz-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "hub-dmz-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    }]
)

# Associate DMZ and route table
hub_dmz_sn_rta = network.SubnetRouteTableAssociation(
    "hub-dmz-sn-rta-",
    route_table_id=hub_dmz_rt.id,
    subnet_id=hub_dmz_sn.id
)

hub_sn_rt = network.RouteTable(
    "hub-sn-rt-", # to be associated with subnets in the hub other than GatewaySubnet, firewall and DMZ 
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=True, #use custom routes for other subnets in hub
    routes=[{
        # partially override VnetLocal to redirect traffic to DMZ via the firewall
        # (be careful to not override the AzureFirewallSubnet address space)
        "name": "hub-sn-fw-dmz-r",
        "address_prefix": dmz_ap,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-sn-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "hub-sn-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    }]
)

# Associate hub example subnet to route table
hub_example_sn_rta = network.SubnetRouteTableAssociation(
    "hub-example-sn-rta-",
    route_table_id=hub_sn_rt.id,
    subnet_id=hub_example_sn.id
)

spokes_sn_rt = network.RouteTable(
    "spokes-sn-rt-", # to be associated with all subnets in spokes
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=True, #use custom routes for subnets in spokes
    # https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
    # because it is not possible to specify the VNet Peering as next_hop_type, ensure that
    # there is no route with an address_prefix which covers the AzureFirewallSubnet
    #ToDo check whether traffic to AzureFirewallManagementSubnet needs special treatment
    routes=[{
        # partially override a VNet Peering to redirect DMZ traffic via the firewall
        "name": "spokes-hub-fw-dmz-r",
        "address_prefix": dmz_ap,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override a VNet Peering to redirect hub traffic via the firewall 
        "name": "spokes-hub-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "spokes-hub-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": "192.168.100.4"
    }]
)

# Associate spoke1 example subnet to route table
spoke1_example_sn_rta = network.SubnetRouteTableAssociation(
    "spoke1-example-sn-rta-",
    route_table_id=spokes_sn_rt.id,
    subnet_id=spoke1_example_sn.id
)