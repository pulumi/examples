from pulumi import Config, get_stack, ResourceOptions, export
from pulumi.resource import CustomTimeouts
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke
import vdc

# retrieve the configuration data
config = Config()
# set default tags to be applied to all taggable resources
stack = get_stack()
default_tags = {
    'environment': stack
}
# set vdc default
vdc.tags = default_tags
# all resources will be created in configuration location
resource_group_name = vdc.resource_group(stack)

# Hub virtual network with gateway, firewall, DMZ and shared services subnets
hub1 = Hub(
    config.require('hub_stem'),
    HubProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        stack = stack,
        config = config,
    ),
    opts=ResourceOptions(custom_timeouts=CustomTimeouts(create='1h', update='1h', delete='1h')),
)

# Spoke virtual network for application environments
spoke1 = Spoke(
    config.require('spoke_stem'),
    SpokeProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        hub = hub1,
        config = config,
    ),
    opts=ResourceOptions(
        depends_on=[hub1.hub_er_gw, hub1.hub_fw, hub1.hub_vpn_gw],
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
