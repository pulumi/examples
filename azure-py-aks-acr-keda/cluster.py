import base64

import pulumi
import pulumi_azure as azure
import pulumi_azuread as azuread
import pulumi_kubernetes as k8s
from pulumi_azure_native import resources, containerservice, containerregistry, authorization, web

import config

resource_group = resources.ResourceGroup(f'{config.resource_name_prefix}-rg-aks', tags=config.default_tags)

ad_app = azuread.Application('app', display_name='app')

ad_sp = azuread.ServicePrincipal(f'{config.resource_name_prefix}-service-principal',
                                 application_id=ad_app.application_id)

ad_sp_password = azuread.ServicePrincipalPassword('sp-password',
                                                  service_principal_id=ad_sp.id,
                                                  value=config.password,
                                                  end_date='2099-01-01T00:00:00Z')

acr = containerregistry.Registry(f'{config.acr_name}acr',
                                 resource_group_name=resource_group.name,
                                 registry_name=f'{config.acr_name}acr',
                                 sku=web.SkuDescriptionArgs(
                                     name="Basic",
                                 ),
                                 tags=config.default_tags,
                                 admin_user_enabled=True
                                 )

primary = azure.core.get_subscription()

role_definition = authorization.RoleDefinition(f'{config.resource_name_prefix}-roleDefinition',
                                               role_name="f{config.resource_name_prefix}-roleDefinition",
                                               scope=primary.id,
                                               permissions=[azure.authorization.RoleDefinitionPermissionArgs(
                                                   actions=["*"],
                                                   not_actions=[],
                                               )],
                                               assignable_scopes=[primary.id])

role_assignment = authorization.RoleAssignment(f'{config.resource_name_prefix}-roleAssignment',
                                               role_definition_id=role_definition.id,
                                               principal_id=ad_sp.id,
                                               principal_type='ServicePrincipal',
                                               scope=acr.id)

k8s_cluster = containerservice.ManagedCluster(f'{config.resource_name_prefix}-aks',
                                              resource_group_name=resource_group.name,
                                              tags=config.default_tags,
                                              addon_profiles={
                                              },
                                              agent_pool_profiles=[{
                                                  'count': config.node_count,
                                                  'max_pods': 110,
                                                  'mode': 'System',
                                                  'name': 'agentpool',
                                                  'node_labels': {},
                                                  'os_disk_size_gb': 30,
                                                  'os_type': 'Linux',
                                                  'type': 'VirtualMachineScaleSets',
                                                  'vm_size': config.node_size,
                                              }],
                                              dns_prefix=resource_group.name,
                                              enable_rbac=True,
                                              kubernetes_version=config.k8s_version,
                                              linux_profile={
                                                  'admin_username': config.admin_username,
                                                  'ssh': {
                                                      'publicKeys': [{
                                                          'keyData': config.ssh_public_key,
                                                      }],
                                                  },
                                              },
                                              node_resource_group='node-resource-group',
                                              service_principal_profile={
                                                  'client_id': ad_app.application_id,
                                                  'secret': ad_sp_password.value,
                                              })

creds = pulumi.Output.all(resource_group.name, k8s_cluster.name).apply(
    lambda args:
    containerservice.list_managed_cluster_user_credentials(
        resource_group_name=args[0],
        resource_name=args[1]))

kubeconfig = creds.kubeconfigs[0].value.apply(
    lambda enc: base64.b64decode(enc).decode())

k8s_provider = k8s.Provider('k8s-provider', kubeconfig=kubeconfig)
