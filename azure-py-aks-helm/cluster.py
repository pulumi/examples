# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

"""Provisions an AKS cluster."""


import base64

from pulumi_azure_native import resources, containerservice
import pulumi
import pulumi_azuread as azuread
import pulumi_kubernetes as k8s

import config


resource_group = resources.ResourceGroup('rg')


ad_app = azuread.Application('app', display_name='app')


ad_sp = azuread.ServicePrincipal('service-principal',
    application_id=ad_app.application_id)


ad_sp_password = azuread.ServicePrincipalPassword('sp-password',
    service_principal_id=ad_sp.id,
    value=config.password,
    end_date='2099-01-01T00:00:00Z')


k8s_cluster = containerservice.ManagedCluster('cluster',
    resource_group_name=resource_group.name,
    addon_profiles={
        'KubeDashboard': {
            'enabled': True,
        },
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


creds = containerservice.list_managed_cluster_user_credentials_output(
    resource_group_name=resource_group.name,
    resource_name=k8s_cluster.name)

kubeconfig = creds.kubeconfigs[0].value.apply(
    lambda enc: base64.b64decode(enc).decode())


k8s_provider = k8s.Provider('k8s-provider', kubeconfig=kubeconfig)
