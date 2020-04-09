from pulumi import ResourceOptions, Config, Output, get_stack, export
from pulumi_azure import core
from hub import Hub, HubArgs
from spoke import Spoke, SpokeArgs

# Retrieve the configuration data
config = Config()
dmz_ar = config.require('dmz_ar')
fwm_ar = config.get('fwm_ar')
fws_ar = config.require('fws_ar')
fwz_as = config.require('fwz_as')
gws_ar = config.require('gws_ar')
hbs_ar = config.get('hbs_ar')
hub_ar = config.get('hub_ar')
hub_as = config.require('hub_as')
sbs_ar = config.get('sbs_ar')
spoke_ar = config.get('spoke_ar')
spoke_as = config.require('spoke_as')

# Azure Resource Group using the location in the stack configuration
resource_group = core.ResourceGroup("vdc-rg-")

# Hub virtual network with gateway, firewall, DMZ and shared services subnets
hub = Hub(
    "hub",
    HubArgs(
    resource_group=resource_group.id,
    dmz_ar=dmz_ar,
    fws_ar=fws_ar,
    fwz_as=fwz_as,
    gws_ar=gws_ar,
    hub_ar=hub_ar,
    hub_as=hub_as,
    fwm_ar=fwm_ar,
    hbs_ar=hbs_ar,
    ),
)

# Spoke virtual network for application environments
spoke = Spoke(
    "spoke",
    SpokeArgs(
    resource_group=resource_group.id,
    dmz_ar=dmz_ar,
    spoke_ar=spoke_ar,
    spoke_as=spoke_as,
    hub_name=hub.name,
    hub_id=hub.id,
    fw_ip=hub.hub_fw_ip,
    hub_gw_rt_name=hub.hub_gw_rt_name,
    hub_dmz_rt_name=hub.hub_dmz_rt_name,
    hub_sn_rt_name=hub.hub_sn_rt_name,
    sbs_ar=sbs_ar,
    ),
)

export("hub_name", hub.name)
export("hub_id", hub.id)
export("hub_sn_name", hub.example_sn_name)
export("hub_sn_id", hub.example_sn_id)
export("hub_fw_name", hub.hub_fw_name)
export("hub_fw_ip", hub.hub_fw_ip)
export("hub_fw_pip", hub.hub_fw_pip)
export("hub_er_gw_name", hub.hub_er_gw_name)
export("hub_er_gw_pip", hub.hub_er_gw_pip)
export("hub_vpn_gw_name", hub.hub_vpn_gw_name)
export("hub_vpn_gw_pip", hub.hub_vpn_gw_pip)

export("subnet_name", spoke.name)
export("subnet_id", spoke.id)
export("subnet_sn_name", spoke.example_sn_name)
export("subnet_sn_id", spoke.example_sn_id)
