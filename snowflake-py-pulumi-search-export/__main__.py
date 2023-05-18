"""A Python Pulumi program"""

import pulumi
import pulumi_aws as aws
import pulumi_command as command
import pulumi_snowflake as snowflake

import datetime
import json
import os

bucket = aws.s3.Bucket("pulumi-search-export")

# TODO: Make this required for security
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

# TODO: Staging bucket

# TODO: Lambda/role
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
                'DESTINATION_BUCKET_ARN': bucket.arn,
            }
        )
    ),
    opts=pulumi.ResourceOptions(
        depends_on=vendor_deps
    )
)


# TODO: Cloudwatch cron

pulumi.export('lambdaArn', function.arn)
