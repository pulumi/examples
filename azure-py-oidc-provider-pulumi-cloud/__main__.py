import pulumi
from pulumi_azure_native import resources, aad, authorization, managedidentity
import pulumi_azuread as azuread
from pulumi_azure import core

issuer = "https://api.pulumi.com/oidc"

# Retrieve local Pulumi configuration
pulumi_config = pulumi.Config()
audience = pulumi_config.require("pulumiOrg")
env_name = pulumi_config.require("environmentName")

# Retrieve local Azure configuration
azure_config = authorization.get_client_config()
az_subscription = azure_config.subscription_id
tenant_id = azure_config.tenant_id

# Create an Azure Resource Group (if necessary)
resource_group = resources.ResourceGroup('resourceGroup')

# Create an Azure AD Application
application = azuread.Application(
    'oidc-app-registration',
    display_name='pulumi-environments-oidc-app',
    sign_in_audience='AzureADMyOrg',
)

# Creates Federated Credentials
federated_identity_credential = azuread.ApplicationFederatedIdentityCredential("federatedIdentityCredential",
    application_object_id=application.object_id,
    display_name="pulumi-environments-oidc-fic",
    description="Federated credentials for Pulumi ESC",
    audiences=[audience],
    issuer=issuer,
    subject=f"pulumi:environments:org:{audience}:env:{env_name}"
)

# Export Outputs required for Environment definition
pulumi.export('ApplicationId', application.application_id)
pulumi.export('DirectoryId', tenant_id)
pulumi.export('SubscriptionId', az_subscription)
