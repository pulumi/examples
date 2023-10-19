import pulumi
from pulumi_azure_native import resources, aad, authorization, managedidentity
import pulumi_azuread as azuread
from pulumi_azure import core
import yaml
import random

number = random.randint(1000,9999)

issuer = "https://api.pulumi.com/oidc"

# Retrieve local Pulumi configuration
pulumi_config = pulumi.Config()
audience = pulumi.get_organization()
env_name = pulumi_config.require("environmentName")

# Retrieve local Azure configuration
azure_config = authorization.get_client_config()
az_subscription = azure_config.subscription_id
tenant_id = azure_config.tenant_id

# Create an Azure Resource Group (if necessary)
resource_group = resources.ResourceGroup(f'resourceGroup-{number}')

# Create an Azure AD Application
application = azuread.Application(
    f'pulumi-oidc-app-reg-{number}',
    display_name='pulumi-environments-oidc-app',
    sign_in_audience='AzureADMyOrg',
)

# Creates Federated Credentials
federated_identity_credential = azuread.ApplicationFederatedIdentityCredential("federatedIdentityCredential",
    application_object_id=application.object_id,
    display_name=f"pulumi-env-oidc-fic-{number}",
    description="Federated credentials for Pulumi ESC",
    audiences=[audience],
    issuer=issuer,
    subject=f"pulumi:environments:org:{audience}:env:{env_name}"
)

print("OIDC configuration complete!")
print("Copy and paste the following template into your Pulumi ESC environment:")
print("--------")

def create_yaml_structure(args):
    application_id, tenant_id, subscription_id = args
    return {
        'values': {
            'azure': {
                'login': {
                    'fn::open::azure-login': {
                        'clientId': application_id,
                        'tenantId': tenant_id,
                        'subscriptionId': f"/subscriptions/{subscription_id}",
                        'oidc': True
                    }
                }
            }
        }
    }

def print_yaml(args):
    yaml_structure = create_yaml_structure(args)
    yaml_string = yaml.dump(yaml_structure, sort_keys=False)
    print(yaml_string)

pulumi.Output.all(application.application_id, tenant_id, az_subscription).apply(print_yaml)
