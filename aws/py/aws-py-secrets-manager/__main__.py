# Copyright 2016-2020, Pulumi Corporation.

import pulumi
from pulumi_aws import secretsmanager

# Create secret
secret = secretsmanager.Secret("secret")

# Create secret version
secret_version = secretsmanager.SecretVersion("secret_version",
                                              secret_id=secret.id,
                                              secret_string="mysecret"
                                              )

# Export secret ID (in this case the ARN)
pulumi.export("secret_id", secret.id)
