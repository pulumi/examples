# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
import base64
import pulumi
import pulumi_azure_native as azure_native
import pulumi_tls as tls

# create a resource group to hold all the resources
resource_group = azure_native.resources.ResourceGroup("resourceGroup")

# create a private key to use for the cluster's  ssh key
private_key = tls.PrivateKey("privateKey", algorithm="RSA", rsa_bits=4096)

# create a user assigned identity to use for the cluster
identity = azure_native.managedidentity.UserAssignedIdentity(
    "identity", resource_group_name=resource_group.name
)

# create the cluster
cluster = azure_native.containerservice.ManagedCluster(
    "cluster",
    resource_group_name=resource_group.name,
    identity=azure_native.containerservice.ManagedClusterIdentityArgs(
        type=azure_native.containerservice.ResourceIdentityType.USER_ASSIGNED,
        user_assigned_identities=[identity.id],
    ),
    kubernetes_version="1.26.3",
    dns_prefix="dns-prefix",
    enable_rbac=True,
    agent_pool_profiles=[
        azure_native.containerservice.ManagedClusterAgentPoolProfileArgs(
            name="agentpool",
            mode="System",
            count=1,
            vm_size="Standard_A2_v2",
            os_type="Linux",
            os_disk_size_gb=30,
            type="VirtualMachineScaleSets",
        )
    ],
    linux_profile=azure_native.containerservice.ContainerServiceLinuxProfileArgs(
        admin_username="aksuser",
        ssh=azure_native.containerservice.ContainerServiceSshConfigurationArgs(
            public_keys=[
                azure_native.containerservice.ContainerServiceSshPublicKeyArgs(
                    key_data=private_key.public_key_openssh,
                )
            ],
        ),
    ),
)

# retrieve the admin credentials for the cluster
admin_credentials = (
    azure_native.containerservice.list_managed_cluster_admin_credentials_output(
        resource_group_name=resource_group.name, resource_name=cluster.name
    )
)

# grant the 'contributor' role to the identity on the resource group
role_assignment = azure_native.authorization.RoleAssignment(
    "roleAssignment",
    principal_id=identity.principal_id,
    principal_type="ServicePrincipal",
    role_definition_id="/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    scope=resource_group.id,
)

# export the kubeconfig
pulumi.export(
    "kubeconfig",
    admin_credentials.apply(
        lambda admin_credentials: base64.b64decode(
            admin_credentials.kubeconfigs[0].value
        )
    ),
)
