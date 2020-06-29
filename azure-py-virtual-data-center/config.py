from ipaddress import ip_address, ip_network
from pulumi import Config, get_stack, get_project, StackReference

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

# retrieve the stack configuration data
config = Config()

# set default tags to be applied to all taggable resources
stack = get_stack()
default_tags = {
    'environment': stack
}

# Azure Bastion hosts in hub and spokes (until functional across peerings)
azure_bastion = config.get_bool('azure_bastion')

# Azure Firewall to route all Internet-bound traffic to designated next hop
forced_tunnel = config.get_bool('forced_tunnel')
# turn off SNAT (private_ranges not yet available on Azure API?)
# https://docs.microsoft.com/en-us/azure/firewall/snat-private-range
if forced_tunnel:
    ft_ip = ip_address(forced_tunnel)
    if ft_ip.is_private:
        private_ranges = 'IANAPrivateRanges'
    else:
        private_ranges = '0.0.0.0./0'

# another stack in the same project and organization may be peered
peer = config.get('peer')
if peer:
    org = config.require('org')
    project = get_project()
    reference = StackReference(f'{org}/{project}/{peer}')
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

# locate hub_address_space within supernet for contiguous spoke_address_space
sup_diff = hub_nw.prefixlen - 8 # largest private IPv4 network is 10/8
super_nw = hub_nw.supernet(prefixlen_diff=sup_diff)
while not super_nw.is_private: # accommodate longer private network prefixes
    sup_diff = sup_diff - 1
    super_nw = hub_nw.supernet(prefixlen_diff=sup_diff)
if sup_diff <= 0:
    raise ConfigError(
        ['hub_address_space'],
        'must be a subnet of a private supernet'
    )
stack_sn = super_nw.subnets(prefixlen_diff=sup_diff)
hub_as = next(stack_sn)
while hub_as < hub_nw:
      hub_as = next(stack_sn)
if hub_address_space != str(hub_as):
    raise ConfigError(['hub_address_space'], 'check assumptions')
