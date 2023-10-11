import pulumi
from pulumi_azure_native import resources, aad, authorization, managedidentity

# Create an Azure Resource Group (if necessary)
resource_group = resources.ResourceGroup('resourceGroup')

# Create an Azure AD Application
application = aad.Application(
    'oidc-app-registration',
    display_name='pulumi-environments-oidc-app',
    sign_in_audience='AzureADMyOrg',
)

# Create an IAM role assignment at the subscription level
role_assignment = authorization.RoleAssignment(
    'role-assignment',
    scope=pulumi.Output.format('/subscriptions/{subscription_id}', subscription_id=resource_group.subscription_id),
    role_definition_id=pulumi.Output.format('/subscriptions/{subscription_id}/providers/Microsoft.Authorization/roleDefinitions/{role_definition_id}',
                                            subscription_id=resource_group.subscription_id,
                                            role_definition_id='094191a3-9fe2-4e88-a4e4-7131a3bb0cd4'),  # ID for "Key Vault Secrets User" role
    principal_id=application.object_id,
)

# Creates Federated Credentials
federated_identity_credential = managedidentity.FederatedIdentityCredential("federatedIdentityCredential",
    audiences=["zephyr"],
    federated_identity_credential_resource_name="pulumi-environments-oidc-fic",
    issuer="https://api.pulumi.com/oidc",
    resource_group_name=resource_group.name,
    resource_name_="resourceName",
    subject="pulumi:environments:org:zephyr:env:azure-provider")

# Export the desired outputs
pulumi.export('Application ID', application.application_id)
pulumi.export('Directory (Tenant) ID', resource_group.tenant_id)
pulumi.export('Subscription ID', resource_group.subscription_id)
