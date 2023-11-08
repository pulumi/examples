import pulumi
from pulumi_gcp import organizations, iam, serviceaccount, projects
import yaml
import random

'''
For the purposes of this example, a random number
will be generated and assigned to parameter values that
require unique values. This should be removed in favor
of providing unique naming conventions where required.
'''
number = random.randint(1000,9999)

issuer = "https://api.pulumi.com/oidc"

# Retrieve local Pulumi configuration
pulumi_config = pulumi.Config()
audience = pulumi.get_organization()
env_name = pulumi_config.require("environmentName")
sub_id = f"pulumi:environments:org:{audience}:env:{env_name}"

# Retrieve project details
project_config = organizations.get_project()
project_id = project_config.number

# Create a Workload Identity Pool
identity_pool = iam.WorkloadIdentityPool("pulumiOidcWorkloadIdentityPool",
    workload_identity_pool_id=f"pulumi-oidc-identity-pool-{number}",
    description="Pulumi OIDC Workload Identity Pool",
    display_name="Pulumi OIDC Identity Pool"
)

# Create a Workload Identity Provider
identity_provider = iam.WorkloadIdentityPoolProvider("pulumiOidcIdentityProvider",
    workload_identity_pool_id=identity_pool.workload_identity_pool_id,
    workload_identity_pool_provider_id=f"pulumi-oidc-provider-{number}",
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
    account_id=f"pulumi-oidc-service-acct-{number}",
    display_name="Pulumi OIDC Service Account"
)

# Grant the service account 'roles/editor' on the project
editor_policy_binding = projects.IAMMember("editorIamBinding",
    member=service_account.email.apply(lambda email: f"serviceAccount:{email}"),
    role="roles/editor",
    project=project_id
)

# Allow the workload identity pool to impersonate the service account
iam_policy_binding = serviceaccount.IAMBinding("iamPolicyBinding",
    service_account_id=service_account.name,
    role="roles/iam.workloadIdentityUser",
    members=identity_pool.name.apply(
        lambda name: [f"principalSet://iam.googleapis.com/{name}/*"]
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
            },
            'pulumiConfig': { 
                'gcp:accessToken': '${gcp.login.accessToken}'
            },
            'environmentVariables': { 
                'GOOGLE_PROJECT': '${gcp.login.project}'
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
