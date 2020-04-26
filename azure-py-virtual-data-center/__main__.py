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

# another stack in the same project and organization may be peered
peer = config.get('peer')
if peer:
    org = config.require('org')
    project = get_project()
    ref = f'{org}/{project}/{peer}'
else:
    ref = None

# single hub virtual network with gateway, firewall, DMZ and shared services
hub = Hub(
    'hub', # stem of child resource names (<4 chars)
    HubProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        stack = stack,
        dmz_ar = config.require('firewall_dmz_subnet'),
        fwm_ar = config.get('firewall_management_subnet'),
        fws_ar = config.require('firewall_subnet'),
        fwz_as = config.require('firewall_address_space'),
        gws_ar = config.require('hub_gateway_subnet'),
        hbs_ar = config.get('hub_bastion_subnet'),
        hub_ar = config.require('hub_first_subnet'),
        hub_as = config.require('hub_address_space'),
        peer = peer,
        ref = ref,
        subnets = [ # extra columns for future NSGs
            ('domain', 'any', 'any'),
            ('files', 'any', 'none'),
        ]
    ),
)

# multiple spoke virtual networks for application environments
spoke1 = Spoke(
    's01', # stem of child resource names (<6 chars)
    SpokeProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        hub = hub,
        sbs_ar = config.get('spoke1_bastion_subnet'),
        spoke_ar = config.require('spoke1_first_subnet'),
        spoke_as = config.require('spoke1_address_space'),
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
    ),
)

spoke2 = Spoke(
    's02', # stem of child resource names (<6 chars)
    SpokeProps(
        resource_group_name = resource_group_name,
        tags = default_tags,
        hub = hub,
        sbs_ar = config.get('spoke2_bastion_subnet'),
        spoke_ar = config.require('spoke2_first_subnet'),
        spoke_as = config.require('spoke2_address_space'),
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
    ),
)

# export information about the stack
export('dmz_ar', hub.dmz_ar) # required for stack peering
export('fw_ip', hub.fw_ip) # required for stack peering
export('hub_as', hub.hub_as) # required for stack peering
export('hub_id', hub.id) # required for stack peering
export('hub_name', hub.name)
export('hub_subnets', hub.subnets.apply(lambda s: s)) # attempt to refresh
export('s01_id', spoke1.id)
export('s01_name', spoke1.name)
export('s01_subnets', spoke1.subnets.apply(lambda s: s)) # attempt to refresh
export('s02_id', spoke2.id)
export('s02_name', spoke2.name)
export('s02_subnets', spoke2.subnets.apply(lambda s: s)) # attempt to refresh
