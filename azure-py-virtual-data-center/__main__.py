from pulumi import Config, get_stack, get_project, export
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

# Another stack in the same project and organisation may be peered
peer = config.get('peer')
if peer:
    org = config.require('org')
    project = get_project()
    ref = f'{org}/{project}/{peer}'

# Hub virtual network with gateway, firewall, DMZ and shared services subnets 
hub1 = Hub(
    'hub', # stem of child resource names (<4 chars)
    HubProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        stack = stack,
        dmz_ar = config.require('dmz_ar'),
        fwm_ar = config.get('fwm_ar'),
        fws_ar = config.require('fws_ar'),
        fwz_as = config.require('fwz_as'),
        gws_ar = config.require('gws_ar'),
        hbs_ar = config.get('hbs_ar'),
        hub_ar = config.require('hub_ar'),
        hub_as = config.require('hub_as'),
        peer = peer,
        ref = ref,
        subnets = [ # extra columns for future NSGs
            ('domain', 'any', 'any'),
            ('files', 'any', 'any'),
        ]
    ),
)

# Spoke virtual network for application environments
spoke1 = Spoke(
    'spoke', # stem of child resource names (<6 chars)
    SpokeProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        hub = hub1,
        sbs_ar = config.get('sbs_ar'),
        spoke_ar = config.require('spoke_ar'),
        spoke_as = config.require('spoke_as'),
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'any'),
            ('app', 'any', 'any'),
            ('db', 'any', 'any'),
        ],
    ),
)

# Exports
export('dmz_ar', hub1.dmz_ar)
export('fw_ip', hub1.fw_ip)
export('hub_as', hub1.hub_as)
export('hub_id', hub1.id)
export('hub_name', hub1.name)
export('hub_subnets', hub1.subnets.apply(lambda s: s)) # ineffective
export('spoke_id', spoke1.id)
export('spoke_name', spoke1.name)
export('spoke_subnets', spoke1.subnets.apply(lambda s: s)) # ineffective
