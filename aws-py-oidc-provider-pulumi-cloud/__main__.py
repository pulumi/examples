import pulumi
from pulumi_aws import iam
import requests
import subprocess
import OpenSSL
import json
import yaml

audience = pulumi.get_organization()
oidc_idp_url = 'https://api.pulumi.com/oidc'
base_url = 'api.pulumi.com/oidc'

# Obtain the OIDC IdP URL and form the configuration document URL
print("Forming configuration document URL...")
configuration_url = f'{oidc_idp_url}/.well-known/openid-configuration'

# Locate "jwks_uri" and extract the domain name
print("Extracting domain name from jwks_uri...")
response = requests.get(configuration_url)
jwks_uri = response.json().get('jwks_uri', '')
domain_name = jwks_uri.split('/')[2]

# Run OpenSSL command to get certificates
print("Retrieving OpenSSL certificates (this will take some time)...")
command = f'openssl s_client -servername {domain_name} -showcerts -connect {domain_name}:443'
result = subprocess.run(command, shell=True, capture_output=True, text=True)
certificates = result.stdout.split('-----END CERTIFICATE-----')

# Get the last certificate from the output
print("Retrieving last OpenSSL certificate...")
last_certificate = certificates[-2] + '-----END CERTIFICATE-----'

# Save the certificate to a file
print("Saving certificate to file...")
with open('certificate.crt', 'w') as file:
    file.write(last_certificate)

# Get the thumbprint of the final certificate
print("Retrieving certificate thumbprint...")
x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, last_certificate)
thumbprint = (x509.digest('sha1').decode()).replace(":", "")

# Create an OIDC identity provider
print("Creating OIDC provider...")
oidc_provider = iam.OpenIdConnectProvider("oidcProvider",
    client_id_lists=[audience],
    thumbprint_lists=[thumbprint],
    url=oidc_idp_url
)

# Create an IAM role with a trust policy that trusts the OIDC provider
print("Creating Provider IAM role...")
def create_assume_role_policy(args):
    url, arn, audience = args
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Federated": arn},
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {"StringEquals": {f"{url}:aud": audience}}
        }]
    }
    return json.dumps(policy)

oidc_role = iam.Role("oidcProviderRole",
    assume_role_policy=pulumi.Output.all(oidc_provider.url, oidc_provider.arn, audience).apply(create_assume_role_policy)
)

print("OIDC configuration complete!")
print("Copy and paste the following template into your Pulumi ESC environment:")
print("--------")
def create_yaml_structure(role_arn):
    return {
        'values': {
            'aws': {
                'login': {
                    'fn::open::aws-login': {
                        'oidc': {
                            'duration': '1h',
                            'roleArn': role_arn,
                            'sessionName': 'pulumi-environments-session'
                        }
                    }
                }
            }
        }
    }

def print_yaml(role_arn):
    yaml_structure = create_yaml_structure(role_arn)
    yaml_string = yaml.dump(yaml_structure, sort_keys=False)
    print(yaml_string)

# Use apply to wait for oidc_role.arn to be available, then print the YAML string
oidc_role.arn.apply(print_yaml)
