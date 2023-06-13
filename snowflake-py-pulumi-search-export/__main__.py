"""A Python Pulumi program"""

import pulumi
import pulumi_aws as aws
import pulumi_command as command
import pulumi_snowflake as snowflake

import datetime
import json
import os
import hashlib
import base64

bucket = aws.s3.Bucket("pulumi-search-export")

# TODO: Make this required for security - don't pull from the env var.
config = pulumi.Config()
pulumi_access_token = config.get_secret(
    "pulumi-access-token") or os.environ['PULUMI_ACCESS_TOKEN']

lambda_name = "pulumi-search-export-to-s3"

ssm_parameter = aws.ssm.Parameter(
    "pulumi-token",
    name=f'/{lambda_name}/pulumi-access-token',
    type="SecureString",
    value=pulumi_access_token,
    description="Pulumi Token that has access to invoke the Pulumi Cloud REST API to export search results",
)

lambda_role = aws.iam.Role(
    "lambda-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    })
)

aws.iam.RolePolicyAttachment(
    "lambda-execute-policy",
    role=lambda_role.name,
    policy_arn="arn:aws:iam::aws:policy/AWSLambdaExecute",
)

ssm_policy = aws.iam.Policy(
    f"{lambda_name}-policy",
    description=f"IAM policy for all perms needed by Lambda function {lambda_name}",
    policy=pulumi.Output.all(ssm_parameter.arn, bucket.arn).apply(lambda args: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "ssm:GetParameter",
                    "ssm:GetParameters",
                    "ssm:GetParametersByPath"
                ],
                "Effect": "Allow",
                "Resource": args[0]
            },
            {
                "Action": [
                    "s3:PutObject",
                ],
                "Effect": "Allow",
                "Resource": args[1]
            },
        ]
    })),
)

aws.iam.RolePolicyAttachment(
    "ssm-params-attachment",
    aws.iam.RolePolicyAttachmentArgs(
        role=lambda_role,
        policy_arn=ssm_policy.arn
    )
)


vendor_deps = command.local.Command(
    "vendor-deps",
    command.local.CommandArgs(
        create="rm -rf .build && mkdir .build && pip install -r ./search_export_to_s3/requirements.txt --target .build && cp search_export_to_s3/handler.py .build",
        # TODO: See if there's an easy way to base this off the contents of requirements.txt
        triggers=[str(datetime.datetime.now())]
    )
)

function = aws.lambda_.Function(
    lambda_name,
    aws.lambda_.FunctionArgs(
        role=lambda_role.arn,
        runtime="python3.8",
        handler="handler.handle",
        code=pulumi.FileArchive('./.build'),
        timeout=60,
        environment=aws.lambda_.FunctionEnvironmentArgs(
            variables={
                'DESTINATION_BUCKET_NAME': bucket.bucket,
            }
        )
    ),
    opts=pulumi.ResourceOptions(
        depends_on=vendor_deps
    )
)

# TODO: Cloudwatch cron (make it configurable)

pulumi.export('lambdaArn', function.arn)

ROLE_NAME = "pulumi-snowflake-storage-integration"

account_id = aws.get_caller_identity().account_id

storage_integration = snowflake.StorageIntegration(
    "snowflake-storage-integration",
    enabled=True,
    storage_aws_role_arn=f"arn:aws:iam::{account_id}:role/{ROLE_NAME}",
    storage_provider="S3",
    type="EXTERNAL_STAGE",
    storage_allowed_locations=["*"]
)

snowflake_assume_role_policy = pulumi.Output.all(storage_integration.storage_aws_iam_user_arn, storage_integration.storage_aws_external_id).apply(lambda args: json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": args[0]},
        "Action": "sts:AssumeRole",
        "Condition": {
            "StringEquals": {"sts:ExternalId": args[1]}
        }
    }]
}))

snowflake_role = aws.iam.Role(
    "snowflake-integration-role",
    name=ROLE_NAME,
    description="Allows Snowflake to access the bucket containing Pulumi Cloud search export files",
    assume_role_policy=snowflake_assume_role_policy
)

snowflake_policy = aws.iam.Policy(
    "snowflake-storage-integation-policy",
    policy=bucket.arn.apply(lambda arn: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:GetObjectVersion",
                    "s3:DeleteObject",
                    "s3:DeleteObjectVersion"
                ],
                "Resource": f"{arn}/*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket",
                    "s3:GetBucketLocation"
                ],
                "Resource": f"{arn}",
            }
        ]
    }))
)

# We can't create databases right now because of a bug in the provider:
# https://github.com/pulumi/pulumi-snowflake/issues/266
DATABASE_NAME = 'pulumi-snowflake-integration-437b96e'

schema = snowflake.Schema(
    "pulumi-snowflake-integration",
    name="PULUMI_SNOWFLAKE_INTEGRATION",
    database=DATABASE_NAME
)

# Welcome to my table! I hope the screen-sharing is working well!

# This is me writing my usual excellent code! Look at how clean everything is!

# table = snowflake.Table(
#     "pulumi-search-exports",
#     name="PULUMI_SEARCH_EXPORTS",
#     database=database.name,
#     schema=schema.name,
#     columns=[
#         {
#             "name": "FILENAME",
#             "type": "STRING",
#             "nullable": False
#         }, {
#             "name": "LAST_MODIFIED_AT",
#             "type": "TIMESTAMP_NTZ",
#             "nullable": False
#         }, {
#             "name": "CONTENT",
#             "type": "OBJECT",
#             "nullable": True
#         }, {
#             "name": "LOADED_AT",
#             "type": "TIMESTAMP_NTZ",
#             "nullable": True
#         }
#     ]
# )
