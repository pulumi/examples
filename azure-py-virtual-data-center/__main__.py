from pulumi import Config, get_stack, ResourceOptions, export
from pulumi.resource import CustomTimeouts
from pulumi_azure import core
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke

# retrieve the configuration data
config = Config()

# set default tags to be applied to all taggable resources
stack = get_stack()
default_tags = {
    'environment': stack
}

# all resources will be created in the Resource Group location
resource_group = core.ResourceGroup(
    stack + '-vdc-rg-',
    tags = default_tags,
)

# Hub virtual network with gateway, firewall, DMZ and shared services subnets
hub1 = Hub(
    config.require('hub_stem'),
    HubProps(
        config = config,
        resource_group = resource_group,
        tags = default_tags,
        stack = stack,
    ),
    opts=ResourceOptions(custom_timeouts=CustomTimeouts(create='1h', update='1h', delete='1h')),
)

# Spoke virtual network for application environments
spoke1 = Spoke(
    config.require('spoke_stem'),
    SpokeProps(
        config = config,
        resource_group = resource_group,
        tags = default_tags,
        hub = hub1,
    ),
    opts=ResourceOptions(
        depends_on=[hub1.hub_vpn_gw, hub1.hub_er_gw, hub1.hub_fw],
        custom_timeouts=CustomTimeouts(create='1h'),
    ),
)

# Exports
export('dmz_ar', config.require('dmz_ar'))
export('hub_as', config.require('hub_as'))
export('hub_fw_ip', hub1.hub_fw_ip)
export('hub_id', hub1.hub_id)
export('hub_name', hub1.hub_name)
export('hub_subnets', hub1.hub_subnets)
export('spoke_id', spoke1.spoke_id)
export('spoke_name', spoke1.spoke_name)
export('spoke_subnets', spoke1.spoke_subnets)
