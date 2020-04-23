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
        depends_on=[hub1.er_gw, hub1.fw, hub1.vpn_gw],
        custom_timeouts=CustomTimeouts(create='1h'), # wait on hub, spoke is quick
    ),
)

# Exports
export('dmz_ar', config.require('dmz_ar'))
export('fw_ip', hub1.fw_ip)
export('hub_as', config.require('hub_as'))
export('hub_id', hub1.id)
export('hub_name', hub1.name)
export('hub_subnets', hub1.subnets.apply(lambda s: s))
export('spoke_id', spoke1.id)
export('spoke_name', spoke1.name)
export('spoke_subnets', spoke1.subnets.apply(lambda s: s))
