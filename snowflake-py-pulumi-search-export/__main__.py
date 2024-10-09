"""A Python Pulumi program"""

import pulumi
import pulumi_aws as aws
import pulumi_command as command
import pulumi_snowflake as snowflake

import datetime
import json
import os

bucket = aws.s3.Bucket("pulumi-search-export")

config = pulumi.Config()
# NOTE: In a production scenario, for security reasons this should should call
# `config.require_secret()`, use a Pulumi access token specifically designated
# for this export process, and not fall back to an environment variable:
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
    description=f"All perms needed by Lambda function {lambda_name}",
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

aws.iam.RolePolicyAttachment(
    "snowflake-policy-attachment",
    role=ROLE_NAME,
    policy_arn=snowflake_policy.arn
)

database = snowflake.Database(
    "pulumi-snowflake-integration",
)

schema = snowflake.Schema(
    "pulumi-snowflake-integration",
    name="PULUMI_SNOWFLAKE_INTEGRATION",
    database=database.name,
)

table = snowflake.Table(
    "pulumi-search-exports",
    name="PULUMI_SEARCH_EXPORTS",
    database=database.name,
    schema=schema.name,
    columns=[
        # Metadata fields:
        {
            "name": "FILENAME",
            "type": "STRING",
            "nullable": False
        },
        {
            "name": "LAST_MODIFIED_AT",
            "type": "TIMESTAMP_NTZ",
            "nullable": False
        },
        {
            "name": "LOADED_AT",
            "type": "TIMESTAMP_NTZ",
            "nullable": False
        },
        # Fields from the exported file:
        {
            "name": "CREATED",
            "type": "TIMESTAMP_NTZ",
            "nullable": True
        },
        {
            "name": "CUSTOM",
            "type": "BOOLEAN",
            "nullable": False
        },
        {
            "name": "DELETE",
            "type": "BOOLEAN",
            "nullable": False
        },
        {
            "name": "ID",
            "type": "VARCHAR",
            "nullable": True
        },
        {
            "name": "MODIFIED",
            "type": "TIMESTAMP_NTZ",
            "nullable": False
        },
        {
            "name": "MODULE",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "NAME",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "PACKAGE",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "PARENT_URL",
            "type": "VARCHAR",
            "nullable": True
        },
        # TODO: Our sample data does not have any rows that have a value in this
        # column. Try to refine this column's definition.
        {
            "name": "PENDING",
            "type": "VARCHAR",
            "nullable": True
        },
        {
            "name": "PROJECT",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "PROTECTED",
            "type": "BOOLEAN",
            "nullable": False
        },
        {
            "name": "PROVIDER_URN",
            "type": "VARCHAR",
            "nullable": True
        },
        {
            "name": "STACK",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "TYPE",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "URN",
            "type": "VARCHAR",
            "nullable": False
        },
        {
            "name": "TEAMS",
            "type": "VARCHAR",
            "nullable": True
        },
        {
            "name": "PROPERTIES",
            "type": "VARCHAR",
            "nullable": True
        },
    ]
)

stage = snowflake.Stage(
    "snowpipe-stage",
    url=pulumi.Output.format("s3://{0}", bucket.bucket),
    database=database.name,
    schema=schema.name,
    storage_integration=storage_integration.name,
    comment="Loads data from an S3 bucket containing Pulumi Insights export data"
)

# Notes:
# 1. The Snowflake PATTERN arguments are regex-style, not `ls` style.
# 2. The PATTERN clause is so that we do not run the COPY statement for files we don't want to import.
copy_statment = pulumi.Output.format("""
COPY INTO \"{0}\".\"{1}\".\"{2}\" 
FROM (SELECT metadata$filename, metadata$file_last_modified, sysdate(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18 FROM @"{0}"."{1}"."{3}")
FILE_FORMAT = (TYPE = CSV, SKIP_HEADER = 1)
PATTERN=\"pulumi-search-exports/.*.csv\"
""", database.name, schema.name, table.name, stage.name)


pulumi.export("copy_statement", copy_statment)

pipe = snowflake.Pipe(
    "pipe",
    auto_ingest=True,
    comment="My pipe's comment",
    copy_statement=copy_statment,
    database=database.name,
    schema=schema.name
)

aws.s3.BucketNotification(
    "bucket-notification",
    bucket=bucket.bucket,
    queues=[{
        "queue_arn": pipe.notification_channel,
        "events": ["s3:ObjectCreated:*"]
    }]
)

pulumi.export("lambdaArn", function.arn)
