import config
import vdc
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke
from pulumi import export

# set required vdc variables before calling function
vdc.location = config.location
vdc.s = config.separator
vdc.suffix = config.suffix
vdc.tags = config.default_tags
resource_group_name = vdc.resource_group(config.stack)

# single hub with gateways, firewall, DMZ, shared services, bastion (optional)
hub = Hub(
    'hub',  # stem of child resource names (<4 chars)
    HubProps(
        azure_bastion=config.azure_bastion,
        forced_tunnel=config.forced_tunnel,
        firewall_address_space=config.firewall_address_space,
        hub_address_space=config.hub_address_space,
        location=config.location,
        peer=config.peer,
        reference=config.reference,
        resource_group_name=resource_group_name,
        separator=config.separator,
        stack=config.stack,
        subnets=[  # extra columns for future ASGs
            ('domain', 'any', 'any'),
            ('files', 'any', 'none'),
        ],
        suffix=config.suffix,
        tags=config.default_tags,
    ),
)

# multiple spokes for application environments with bastion access (optional)
spoke1 = Spoke(
    's01',  # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion=config.azure_bastion,
        fw_rt_name=hub.fw_rt_name,
        hub=hub,
        location=config.location,
        peer=config.peer,
        reference=config.reference,
        resource_group_name=resource_group_name,
        separator=config.separator,
        spoke_address_space=str(next(config.stack_sn)),
        subnets=[  # extra columns for future ASGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        suffix=config.suffix,
        tags=config.default_tags,
    ),
)

spoke2 = Spoke(
    's02',  # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion=config.azure_bastion,
        fw_rt_name=hub.fw_rt_name,
        hub=hub,
        location=config.location,
        peer=config.peer,
        reference=config.reference,
        resource_group_name=resource_group_name,
        separator=config.separator,
        spoke_address_space=str(next(config.stack_sn)),
        subnets=[  # extra columns for future ASGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        suffix=config.suffix,
        tags=config.default_tags,
    ),
)

# export information about the stack required for stack peering
export('dmz_ar', hub.dmz_ar)
export('fw_ip', hub.fw_ip)
export('hub_as', hub.address_space)
export('hub_id', hub.id)
export('s01_as', spoke1.address_space)
export('s01_id', spoke1.id)
export('s02_as', spoke2.address_space)
export('s02_id', spoke2.id)
