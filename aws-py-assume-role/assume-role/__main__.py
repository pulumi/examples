# Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import pulumi_aws as aws
from pulumi_aws.config.vars import region
from pulumi import Config, ResourceOptions, export


def require_region():
    """
    require_region fetches the AWS region, requiring that it exists. if it does
    not exist, an exception is raised. Mirrors the TypeScript equivalent in:
    https://github.com/pulumi/pulumi-aws/blob/
    2b541a94242d9cf6f795a60775a4f3e8708dd85d/sdk/nodejs/config/require.ts
    """
    if not region:
        raise Exception('No AWS region has been configured')
    return region


config = Config()
role_to_assume_arn = config.require('roleToAssumeARN')

provider = aws.Provider(
    'privileged',
    assume_role={
        'role_arn': role_to_assume_arn,
        'session_name': 'PulumiSession',
        'externalId': 'PulumiApplication',
    },
    region=require_region()
)

# Creates an AWS resource (S3 Bucket)
bucket = aws.s3.Bucket(
    'my-bucket',
    opts=ResourceOptions(provider=provider)
)

# Exports the DNS name of the bucket
export('bucket_name', bucket.bucket_domain_name)
