import pulumi
from pulumi_aws import iam
import pulumi_tls as tls
import requests
import subprocess
import OpenSSL
import json
import yaml

audience = pulumi.get_organization()
oidc_idp_url = "https://api.pulumi.com/oidc"
base_url = "api.pulumi.com/oidc"

# Obtain the certificate of the URL provided

certificate = tls.get_certificate(url=oidc_idp_url)

# Create an OIDC identity provider
print("Creating OIDC provider...")
oidc_provider = iam.OpenIdConnectProvider(
    "oidcProvider",
    client_id_lists=[audience],
    thumbprint_lists=[certificate.certificates[0].sha1_fingerprint],
    url=oidc_idp_url,
)

# Create an IAM role with a trust policy that trusts the OIDC provider
print("Creating Provider IAM role...")


def create_assume_role_policy(args):
    url, arn, audience = args
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Federated": arn},
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {"StringEquals": {f"{url}:aud": audience}},
            }
        ],
    }
    return json.dumps(policy)


oidc_role = iam.Role(
    "oidcProviderRole",
    assume_role_policy=pulumi.Output.all(oidc_provider.url, oidc_provider.arn, audience).apply(
        create_assume_role_policy
    ),
)

print("OIDC configuration complete!")
print("Copy and paste the following template into your Pulumi ESC environment:")
print("--------")


def create_yaml_structure(role_arn):
    return {
        "values": {
            "aws": {
                "login": {
                    "fn::open::aws-login": {
                        "oidc": {
                            "duration": "1h",
                            "roleArn": role_arn,
                            "sessionName": "pulumi-environments-session",
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
