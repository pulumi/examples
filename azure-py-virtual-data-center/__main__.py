import pulumi
from pulumi_azure import core, network

# Retrieve the configuration data
config = pulumi.Config()
dmz_ar = config.require('dmz_ar')
fwm_ar = config.require('fwm_ar')
fws_ar = config.require('fws_ar')
fwz_as = config.require('fwz_as')
gws_ar = config.require('gws_ar')
hub_ar = config.require('hub_ar')
hub_as = config.require('hub_as')
spoke1_ar = config.require('spoke1_ar')
spoke1_as = config.require('spoke1_as')

# Azure Resource Group using the location in the stack configuration
resource_group = core.ResourceGroup("vdc-rg-")

# Hub VNet which will contain gateway, firewall, DMZ and an example subnet
hub = network.VirtualNetwork(
    "hub-vn-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    # separate firewall/DMZ address space to simplify custom routing as subnets are added
    address_spaces=[fwz_as, hub_as]
    # avoid use of subnets= (use standalone Subnet resource instead)
)

# Deploy all vnets and subnets before long-running gateway and firewall deployment

hub_fwm_sn = network.Subnet(
    "hub-fwm-sn",
    name="AzureFirewallManagementSubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=fwm_ar,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_dmz_sn = network.Subnet( #ToDo add NSG preventing access except via firewall
    "hub-dmz-sn",
    name="DMZ", # specific physical name not required but preferred due to special routing for DMZ
    resource_group_name=resource_group.name,
    address_prefix=dmz_ar,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

# As many subnets as required for shared services may be created in the hub
hub_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in hub
    "hub-example-sn-",
    resource_group_name=resource_group.name,
    address_prefix=hub_ar,
    virtual_network_name=hub.name
)

# Spoke virtual network for application environments (additional spokes may be modelled on this)
spoke1 = network.VirtualNetwork(
    "spoke1-vn-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    address_spaces=[spoke1_as]
    # avoid use of subnets= (use standalone Subnet resource instead)
    # there should be no GatewaySubnet in the spokes
)

# As many subnets as required for application environments may be created in the spoke
spoke1_example_sn = network.Subnet( #ToDo add NSG for inter-subnet traffic in spoke1
    "spoke1-example-sn-",
    resource_group_name=resource_group.name,
    address_prefix=spoke1_ar,
    virtual_network_name=spoke1.name
)

# Leave these subnets to last as they are depended on by gateways and firewall

hub_gw_sn = network.Subnet(
    "hub-gw-sn",
    name="GatewaySubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=gws_ar,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

hub_fw_sn = network.Subnet(
    "hub-fw-sn",
    name="AzureFirewallSubnet", # specific physical name required
    resource_group_name=resource_group.name,
    address_prefix=fws_ar,
    virtual_network_name=hub.name,
    opts=pulumi.ResourceOptions(delete_before_replace=True)
)

# Public IP for the VPN Gateway
hub_vpn_gw_pip = network.PublicIp(
    "hub-vpn-gw-pip-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    allocation_method="Dynamic"
)

vpn_gw_pip = hub_vpn_gw_pip.ip_address

# VPN Gateway
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

# Public IP for the ExpressRoute Gateway
hub_er_gw_pip = network.PublicIp(
    "hub-er-gw-pip-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    allocation_method="Dynamic"
)

er_gw_pip = hub_er_gw_pip.ip_address

# ExpressRoute Gateway
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

# Public IP for the Azure Firewall
hub_fw_pip = network.PublicIp(
    'hub-fw-pip-',
    resource_group_name=resource_group.name,
    location=resource_group.location,
    sku="Standard",
    allocation_method="Static"
)

# Azure Firewall
hub_fw = network.Firewall(
    "hub-fw-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    ip_configurations=[{
        "name": "hub-fw-ipconf",
        "subnet_id": hub_fw_sn.id,
        "publicIpAddressId": hub_fw_pip.id
    }]
)

# Work around https://github.com/pulumi/pulumi/issues/4040
fw_ip = hub_fw.ip_configurations.apply(lambda ipc: ipc[0].get('private_ip_address'))

# VNet Peering from the hub to spoke (additional spokes require similar)
hub_spoke1 = network.VirtualNetworkPeering(
    "hub-spoke1-vnp-",
    resource_group_name=resource_group.name,
    virtual_network_name=hub.name,
    remote_virtual_network_id=spoke1.id,
    allow_gateway_transit=True,
    allow_virtual_network_access=True
)

# VNet Peering from spoke to the hub (additional spokes require similar)
spoke1_hub = network.VirtualNetworkPeering(
    "spoke1-hub-vnp-",
    resource_group_name=resource_group.name,
    virtual_network_name=spoke1.name,
    remote_virtual_network_id=hub.id,
    allow_forwarded_traffic=True,
    use_remote_gateways=True, # a gateway must be provisioned already or this will fail
    allow_virtual_network_access=True,
    opts=pulumi.ResourceOptions(depends_on=[hub_er_gw]) # doesn't require both gateways
)

# Custom routes to direct all traffic between virtual networks through the firewall

# Route table to be associated with the GatewaySubnet only
hub_gw_rt = network.RouteTable(
    "hub-gw-rt-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=False, #use BGP for the gateway
    routes=[{
        # partially override VnetLocal to redirect traffic to DMZ via the firewall
        # (be careful to not override the AzureFirewallSubnet address space)
        "name": "hub-gw-fw-dmz-r",
        "address_prefix": dmz_ar,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override VNetLocal to redirect other hub subnet traffic via the firewall
        "name": "hub-gw-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-gw-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    }]
)

# Associate GatewaySubnet with route table
hub_gw_sn_rta = network.SubnetRouteTableAssociation(
    "hub-gw-sn-rta-",
    route_table_id=hub_gw_rt.id,
    subnet_id=hub_gw_sn.id
)

# Route table to be associated with DMZ subnet only
hub_dmz_rt = network.RouteTable(
    "hub-dmz-rt-",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=True, #use custom routes for the DMZ
    routes=[{
        # partially override VnetLocal to redirect intra-DMZ traffic via the firewall
        "name": "hub-dmz-fw-dmz-r",
        "address_prefix": dmz_ar,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # partially override VnetLocal to redirect hub traffic via the firewall
        "name": "hub-dmz-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-dmz-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "hub-dmz-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    }]
)

# Associate DMZ subnet with route table
hub_dmz_sn_rta = network.SubnetRouteTableAssociation(
    "hub-dmz-sn-rta-",
    route_table_id=hub_dmz_rt.id,
    subnet_id=hub_dmz_sn.id
)

# Route table to be associated with shared services subnets in the hub (not GatewaySubnet, firewall or DMZ)
hub_sn_rt = network.RouteTable(
    "hub-sn-rt-", 
    resource_group_name=resource_group.name,
    location=resource_group.location,
    disable_bgp_route_propagation=True, #use custom routes for other subnets in hub
    routes=[{
        # partially override VnetLocal to redirect traffic to DMZ via the firewall
        # (be careful to not override the AzureFirewallSubnet address space)
        "name": "hub-sn-fw-dmz-r",
        "address_prefix": dmz_ar,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override VNet Peering to redirect spoke1 traffic via the firewall (future spokes require similar)
        "name": "hub-sn-fw-spoke1-r",
        "address_prefix": spoke1_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "hub-sn-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    }]
)

# Associate hub example subnet to route table
hub_example_sn_rta = network.SubnetRouteTableAssociation(
    "hub-example-sn-rta-",
    route_table_id=hub_sn_rt.id,
    subnet_id=hub_example_sn.id
)

# Route table to be associated with all subnets in spokes
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
        "address_prefix": dmz_ar,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override a VNet Peering to redirect hub traffic via the firewall 
        "name": "spokes-hub-fw-sn-r",
        "address_prefix": hub_as,
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    },
    {
        # override the system route to redirect Internet traffic via the firewall
        "name": "spokes-hub-fw-dg-r",
        "address_prefix": "0.0.0.0/0",
        "next_hop_type": "VirtualAppliance",
        "next_hop_in_ip_address": fw_ip
    }]
)

# Associate spoke1 example subnet to route table
spoke1_example_sn_rta = network.SubnetRouteTableAssociation(
    "spoke1-example-sn-rta-",
    route_table_id=spokes_sn_rt.id,
    subnet_id=spoke1_example_sn.id
)

# Export deployment information
pulumi.export("hub_fw", hub_fw.name)
pulumi.export("hub_fw_ip", fw_ip)
pulumi.export("hub_fw_pip", hub_fw_pip.ip_address)
pulumi.export("hub_er_gw", hub_er_gw.name)
pulumi.export("hub_er_gw_pip", er_gw_pip)
pulumi.export("hub_vpn_gw", hub_vpn_gw.name)
pulumi.export("hub_vpn_gw_pip", vpn_gw_pip)
