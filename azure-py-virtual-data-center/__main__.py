from ipaddress import ip_network
from pulumi import Config, get_stack, get_project, export
from hub import HubProps, Hub
from spoke import SpokeProps, Spoke
import vdc

class Error(Exception):
    """Base class for exceptions in this module."""
    pass

class ConfigError(Error):
    """Exception raised for errors in Pulumi Config.

    Attributes:
        keys -- Config keys with the error
        message -- explanation of the error
    """
    def __init__(self, keys: [str], message: str):
        self.keys = keys
        self.message = message

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

# Azure Bastion hosts in hub and spokes (until functional across peerings)
azure_bastion = config.get_bool('azure_bastion')

# another stack in the same project and organization may be peered
peer = config.get('peer')
if peer:
    org = config.require('org')
    project = get_project()
    reference = f'{org}/{project}/{peer}'
else:
    reference = None

# validate firewall_address_space and hub_address_space
firewall_address_space = config.require('firewall_address_space')
fwz_nw = ip_network(firewall_address_space)
if not fwz_nw.is_private:
    raise ConfigError(['firewall_address_space'], 'must be private')
if fwz_nw.prefixlen > 24:
    raise ConfigError(['firewall_address_space'], 'must be /24 or larger')
hub_address_space = config.require('hub_address_space')
hub_nw = ip_network(hub_address_space)
if not hub_nw.is_private:
    raise ConfigError(['hub_address_space'], 'must be private')
if hub_nw.prefixlen > 24:
    raise ConfigError(['hub_address_space'], 'must be /24 or larger')
if fwz_nw.overlaps(hub_nw):
    raise ConfigError(
        ['firewall_address_space', 'hub_address_space'],
        'may not overlap'
    )

# single hub with gateways, firewall, DMZ, shared services, bastion (optional)
hub = Hub('hub', # stem of child resource names (<4 chars)
    HubProps(
        azure_bastion = azure_bastion,
        forced_tunnel = config.get_bool('forced_tunnel'),
        firewall_address_space = firewall_address_space,
        hub_address_space = hub_address_space,
        peer = peer,
        reference = reference,
        resource_group_name = resource_group_name,
        stack = stack,
        subnets = [ # extra columns for future NSGs
            ('domain', 'any', 'any'),
            ('files', 'any', 'none'),
        ],
        tags = default_tags,
    ),
)

# locate hub_address_space within supernet for contiguous spoke_address_space
sup_diff = hub_nw.prefixlen - 8 # largest private IPv4 network is 10/8
super_nw = hub_nw.supernet(prefixlen_diff=sup_diff)
while not super_nw.is_private: # accommodate longer private network prefixes
    sup_diff = sup_diff - 1
    super_nw = hub_nw.supernet(prefixlen_diff=sup_diff)
if sup_diff <= 0:
    raise ConfigError(
        ['hub_address_space'],
        'must belong to a private supernet'
    )
stack_sn = super_nw.subnets(prefixlen_diff=sup_diff)
hub_as = next(stack_sn)
while hub_as < hub_nw:
      hub_as = next(stack_sn)
if hub_address_space != str(hub_as):
    raise ConfigError(['hub_address_space'], 'check assumptions')

# multiple spokes for application environments with bastion access (optional)
spoke_address_space = str(next(stack_sn))
spoke1 = Spoke('s01', # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion = azure_bastion,
        hub = hub,
        resource_group_name = resource_group_name,
        spoke_address_space = spoke_address_space,
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        tags = default_tags,
    ),
)

spoke_address_space = str(next(stack_sn))
spoke2 = Spoke('s02', # stem of child resource names (<6 chars)
    SpokeProps(
        azure_bastion = azure_bastion,
        hub = hub,
        resource_group_name = resource_group_name,
        spoke_address_space = spoke_address_space,
        subnets = [ # extra columns for future NSGs
            ('web', 'any', 'app'),
            ('app', 'web', 'db'),
            ('db', 'app', 'none'),
        ],
        tags = default_tags,
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
