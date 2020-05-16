import config
import vdc
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke
from pulumi import export

# set required vdc variable before calling function
vdc.tags = config.default_tags
# all resources will be created in configuration location
resource_group_name = vdc.resource_group(config.stack)

# single hub with gateways, firewall, DMZ, shared services, bastion (optional)
hub = Hub('hub', # stem of child resource names (<4 chars)
    HubProps(
        azure_bastion = config.azure_bastion,
        forced_tunnel = config.forced_tunnel,
        firewall_address_space = config.firewall_address_space,
        hub_address_space = config.hub_address_space,
        peer = config.peer,
        reference = config.reference,
        resource_group_name = resource_group_name,
        stack = config.stack,
        subnets = [ # extra columns for future NSGs
            ('domain', 'any', 'any'),
            ('files', 'any', 'none'),
        ],
        tags = config.default_tags,
    ),
)

# multiple spokes for application environments with bastion access (optional)
spoke1 = Spoke('s01', # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion = config.azure_bastion,
        hub = hub,
        resource_group_name = resource_group_name,
        spoke_address_space = str(next(config.stack_sn)),
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        tags = config.default_tags,
    ),
)

spoke2 = Spoke('s02', # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion = config.azure_bastion,
        hub = hub,
        resource_group_name = resource_group_name,
        spoke_address_space = str(next(config.stack_sn)),
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        tags = config.default_tags,
    ),
)

# export information about the stack
export('dmz_ar', hub.dmz_ar) # required for stack peering
export('fw_ip', hub.fw_ip) # required for stack peering
export('hub_as', hub.hub_as) # required for stack peering
export('hub_id', hub.id) # required for stack peering
export('hub_name', hub.name)
export('hub_subnets', hub.subnets)
export('s01_id', spoke1.id)
export('s01_name', spoke1.name)
export('s01_subnets', spoke1.subnets)
export('s02_id', spoke2.id)
export('s02_name', spoke2.name)
export('s02_subnets', spoke2.subnets)
