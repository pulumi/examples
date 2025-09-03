# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi_aws as aws
from pulumi import Config, ResourceOptions, export, runtime

config = Config()
role_to_assume_arn = config.require("roleToAssumeARN")
aws_config = Config("aws")

is_preview = runtime.is_dry_run()
# Apply-time guard: prevent using preview placeholder on apply
if not is_preview and role_to_assume_arn.startswith("arn:aws:iam::123456789012:role/preview-"):
    raise Exception("Configure a real roleToAssumeARN before 'pulumi up'. Example: pulumi config set aws-py-assume-role:roleToAssumeARN arn:aws:iam::<account>:role/<roleName>")
if is_preview:
    provider = aws.Provider(
        "privileged",
        region=aws_config.require("region"),
    )
else:
    provider = aws.Provider(
        "privileged",
        region=aws_config.require("region"),
        assume_roles=[
            {
                "role_arn": role_to_assume_arn,
                # session name can contain only the following special characters =,.@-
                # if any other special character is used, an error stating that the role
                # cannot be assumed will be returned
                "session_name": "PulumiSession",
                "externalId": "PulumiApplication",
            }
        ],
    )

# Creates an AWS resource (S3 Bucket)
bucket = aws.s3.Bucket("my-bucket", opts=ResourceOptions(provider=provider))

# Exports the DNS name of the bucket
export("bucket_name", bucket.bucket_domain_name)
