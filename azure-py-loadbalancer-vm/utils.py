from pulumi import (
    Output
)

from pulumi_azure_native import (
    network
)

def get_ip_address(rg_name: Output[str], ip_name: Output[str]) -> Output[network.GetPublicIPAddressResult]:
    return network.get_public_ip_address_output(
        resource_group_name=rg_name,
        public_ip_address_name=ip_name,
    )