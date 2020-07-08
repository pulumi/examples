# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import pulumi_aws as aws
from pulumi_aws.config.vars import region
from pulumi import Config, ResourceOptions, export

config = Config()
role_to_assume_arn = config.require('roleToAssumeARN')
aws_config = Config('aws')

provider = aws.Provider(
    'privileged',
    assume_role={
        'role_arn': role_to_assume_arn,
        'session_name': 'PulumiSession',
        'externalId': 'PulumiApplication',
    },
    region=aws_config.require('region')
)

# Creates an AWS resource (S3 Bucket)
bucket = aws.s3.Bucket(
    'my-bucket',
    opts=ResourceOptions(provider=provider)
)

# Exports the DNS name of the bucket
export('bucket_name', bucket.bucket_domain_name)
