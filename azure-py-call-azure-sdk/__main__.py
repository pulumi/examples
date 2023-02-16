"""A program to demonstrate accessing Azure Python SDK"""

from azure.core.credentials import AccessToken
from azure.mgmt.authorization import AuthorizationManagementClient
from pulumi_azure_native import authorization, containerregistry, resources


class TokenCred:
    def __init__(self, token):
        self.token = token

    def get_token(self, *scopes, **kwargs) -> 'AccessToken':
        return AccessToken(token=self.token, expires_on=-1)


def get_role_id_by_name(name, scope=""):
    config = authorization.get_client_config()
    client_token = authorization.get_client_token()
    client = AuthorizationManagementClient(
        TokenCred(client_token.token), config.subscription_id)
    def_pages = client.role_definitions.list(
        scope, filter=f"roleName eq '{name}'")
    role = None
    for x in def_pages:
        role = x.id
        break
    if role is None:
        raise Exception(f'role \'{name}\' not found at scope \'{scope}\'')
    return role


# Create an Azure Resource Group
resource_group = resources.ResourceGroup('resource_group')

# Create a container registry
container_registry = containerregistry.Registry(
    'registry',
    resource_group_name=resource_group.name,
    sku=containerregistry.SkuArgs(name='Basic'),
    admin_user_enabled=True)

client_config = authorization.get_client_config()
current_principal = client_config.object_id

roledef = get_role_id_by_name('AcrPull')

authorization.RoleAssignment("access-from-cluster",
                             principal_id=current_principal,
                             # adjust this if running as user
                             principal_type=authorization.PrincipalType.SERVICE_PRINCIPAL,
                             role_definition_id=roledef,
                             scope=container_registry.id)
