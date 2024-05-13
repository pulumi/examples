# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import json

import pulumi_aws as aws
from pulumi import Config, Output, ResourceOptions, export


def assume_role_policy_for_principal(principal):
    """
    assume_role_policy_for_principal returns a well-formed policy document
    which can be used to control which principals may assume an IAM Role, by
    granting the `sts:AssumeRole` action to those principals.
    """
    return Output.json_dumps({
        'Version': '2012-10-17',
        'Statement': [
            {
                'Sid': 'AllowAssumeRole',
                'Effect': 'Allow',
                'Principal': principal,
                'Action': 'sts:AssumeRole'
            }
        ]
    })


config = Config()
unprivileged_username = config.require('unprivilegedUsername')

unprivileged_user = aws.iam.User(
    'unprivileged-user',
    name=unprivileged_username
)

unprivileged_user_creds = aws.iam.AccessKey(
    'unprivileged-user-key',
    user=unprivileged_user.name,
    # additional_secret_outputs specify properties that must be encrypted as secrets
    # https://www.pulumi.com/docs/intro/concepts/resources/#additionalsecretoutputs
    opts=ResourceOptions(additional_secret_outputs=["secret"])
)

allow_s3_management_role = aws.iam.Role('allow-s3-management',
    description='Allow management of S3 buckets',
    assume_role_policy=assume_role_policy_for_principal({'AWS': unprivileged_user.arn})
)

policy = aws.iam.RolePolicy('allow-s3-management-policy',
    role=allow_s3_management_role,
    policy=json.dumps({
        'Version': '2012-10-17',
        'Statement': [{
            'Sid': 'AllowS3Management',
            'Effect': 'Allow',
            'Resource': '*',
            'Action': 's3:*',
        }],
    }),
    opts=ResourceOptions(parent=allow_s3_management_role)
)

export('roleArn', allow_s3_management_role.arn)
export('accessKeyId', unprivileged_user_creds.id)
export('secretAccessKey', unprivileged_user_creds.secret)
