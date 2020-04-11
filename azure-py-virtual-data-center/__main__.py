from pulumi import Config, export, ResourceOptions, get_stack
from pulumi.resource import CustomTimeouts
from pulumi_azure import core
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke

# Retrieve the configuration data
config = Config()
hub_stem = config.require('hub_stem')
dmz_ar = config.require('dmz_ar')
fwm_ar = config.get('fwm_ar')
fws_ar = config.require('fws_ar')
fwz_as = config.require('fwz_as')
gws_ar = config.require('gws_ar')
hbs_ar = config.get('hbs_ar')
hub_ar = config.get('hub_ar')
hub_as = config.require('hub_as')
spoke_stem = config.require('spoke_stem')
sbs_ar = config.get('sbs_ar')
spoke_ar = config.get('spoke_ar')
spoke_as = config.require('spoke_as')

# Azure Resource Group using the location in the stack configuration
stack_name = get_stack()
default_tags = {
    "environment": stack_name
}
resource_group = core.ResourceGroup(
    stack_name + "-vdc-rg-",
    tags = default_tags,
)

# Hub virtual network with gateway, firewall, DMZ and shared services subnets
hub1 = Hub(
    hub_stem,
    HubProps(
    resource_group = resource_group,
    tags = default_tags,
    dmz_ar = dmz_ar,
    fws_ar = fws_ar,
    fwz_as = fwz_as,
    gws_ar = gws_ar,
    hub_ar = hub_ar,
    hub_as = hub_as,
    fwm_ar = fwm_ar,
    hbs_ar = hbs_ar,
    ),
    opts=ResourceOptions(custom_timeouts=CustomTimeouts(create='1h')),
)

# Spoke virtual network for application environments
spoke1 = Spoke(
    spoke_stem,
    SpokeProps(
    resource_group = resource_group,
    tags = default_tags,
    hub_stem = hub_stem,
    hub_name = hub1.hub_name,
    hub_id = hub1.hub_id,
    hub_fw_ip = hub1.hub_fw_ip,
    hub_gw_rt_name = hub1.hub_gw_rt_name,
    hub_dmz_rt_name = hub1.hub_dmz_rt_name,
    hub_sn_rt_name = hub1.hub_sn_rt_name,
    hub_as = hub_as,
    dmz_ar = dmz_ar,
    spoke_as = spoke_as,
    sbs_ar = sbs_ar,
    spoke_ar = spoke_ar,
    ),
    opts=ResourceOptions(
        depends_on=[hub1.hub_er_gw, hub1.hub_vpn_gw],
        custom_timeouts=CustomTimeouts(create='1h')
    ),
)

# Exports
export("hub_name", hub1.hub_name)
export("hub_id", hub1.hub_id)
export("hub_subnets", hub1.hub_subnets)

export("spoke_name", spoke1.spoke_name)
export("spoke_id", spoke1.spoke_id)
export("spoke_subnets", spoke1.spoke_subnets)
