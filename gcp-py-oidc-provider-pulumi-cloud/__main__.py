import pulumi
from pulumi_gcp import organizations, iam, serviceaccount
import yaml

issuer = "https://api.pulumi.com/oidc"

# Retrieve local Pulumi configuration
pulumi_config = pulumi.Config()
audience = pulumi.get_organization()
env_name = pulumi_config.require("environmentName")
sub_id = f"pulumi:environments:org:{audience}:env:{env_name}"

# Select the billing-enabled GCP Project from local GCP config
client_config = organizations.get_client_config()
project_name = client_config.project

# Retrieve project details
project_config = organizations.get_project()
project_id = project_config.number

# Create a Workload Identity Pool
identity_pool = iam.WorkloadIdentityPool("pulumiOidcWorkloadIdentityPool",
    workload_identity_pool_id="test-pulumi-oidc-identity-pool",
    description="Pulumi OIDC Workload Identity Pool",
    display_name="Pulumi OIDC Identity Pool"
)

# Create a Workload Identity Provider
identity_provider = iam.WorkloadIdentityPoolProvider("pulumiOidcIdentityProvider",
    workload_identity_pool_id=identity_pool.workload_identity_pool_id,
    workload_identity_pool_provider_id="pulumi-oidc-provider",
    attribute_mapping={
            "google.subject": "assertion.sub",
        },
    oidc=iam.WorkloadIdentityPoolProviderOidcArgs(
        issuer_uri=issuer,
        allowed_audiences=[
            audience
        ]
    )
)

# Create a service account
service_account = serviceaccount.Account("serviceAccount",
    account_id="pulumi-oidc-service-account",
    display_name="Pulumi OIDC Service Account"
)

# Create an IAM policy binding to grant the identity pool access to the service account
iam_policy_binding = serviceaccount.IAMBinding("iamPolicyBinding",
    service_account_id=service_account.name,
    role="roles/iam.workloadIdentityUser",
    members=identity_pool.name.apply(
        lambda name: [f"principal://iam.googleapis.com/{name}/subject/{sub_id}"]
    )
)

# Generate Pulumi ESC YAML template
def create_yaml_structure(args):
    gcp_project, workload_pool_id, provider_id, service_account_email = args
    return {
        'values': {
            'gcp': {
                'login': {
                    'fn::open::gcp-login': {
                        'project': int(gcp_project),
                        'oidc': {
                            'workloadPoolId': workload_pool_id,
                            'providerId': provider_id,
                            'serviceAccount': service_account_email
                        }
                    }
                }
            }
        }
    }

def print_yaml(args):
    yaml_structure = create_yaml_structure(args)
    yaml_string = yaml.dump(yaml_structure, sort_keys=False)
    print(yaml_string)

pulumi.Output.all(
    project_id,
    identity_provider.workload_identity_pool_id,
    identity_provider.workload_identity_pool_provider_id,
    service_account.email
).apply(print_yaml)
