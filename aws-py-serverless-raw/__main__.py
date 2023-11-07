"""Copyright 2016-2019, Pulumi Corporation.  All rights reserved."""
import json

import pulumi
import pulumi_aws as aws

# The location of the built dotnet3.1 application to deploy
dotnet_application_publish_folder = "./app/bin/Debug/net6.0/publish"
dotnet_application_entry_point = "app::app.Functions::GetAsync"
# The stage name to use for the API Gateway URL
custom_stage_name = "api"

region = aws.config.region

#################
## DynamoDB Table
#################

# A DynamoDB table with a single primary key
counter_table = aws.dynamodb.Table("counterTable",
    attributes=[
        aws.dynamodb.TableAttributeArgs(
            name="Id",
            type="S",
        ),
    ],
    hash_key="Id",
    read_capacity=1,
    write_capacity=1,
)

##################
## Lambda Function
##################

# Give our Lambda access to the Dynamo DB table, CloudWatch Logs and Metrics
# Python package does not have assumeRolePolicyForPrinciple
instance_assume_role_policy = aws.iam.get_policy_document(
    statements=[aws.iam.GetPolicyDocumentStatementArgs(
        actions=["sts:AssumeRole"],
        principals=[aws.iam.GetPolicyDocumentStatementPrincipalArgs(
            identifiers=["lambda.amazonaws.com"],
            type="Service",
        )],
    )])

role = aws.iam.Role("mylambda-role",
    assume_role_policy=instance_assume_role_policy.json,
)

policy = aws.iam.RolePolicy("mylambda-policy",
    role=role.id,
    policy=pulumi.Output.json_dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": ["dynamodb:UpdateItem", "dynamodb:PutItem", "dynamodb:GetItem",
                        "dynamodb:DescribeTable"],
            "Resource": counter_table.arn,
            "Effect": "Allow",
        }, {
            "Action": ["logs:*", "cloudwatch:*"],
            "Resource": "*",
            "Effect": "Allow",
        }],
    }))

# Read the config of whether to provision fixed concurrency for Lambda
config = pulumi.Config()
provisioned_concurrent_executions = config.get_float('provisionedConcurrency')

# Create a Lambda function, using code from the `./app` folder.

lambda_func = aws.lambda_.Function("mylambda",
    opts=pulumi.ResourceOptions(depends_on=[policy]),
    runtime="dotnetcore3.1",
    code=pulumi.AssetArchive({
        ".": pulumi.FileArchive(dotnet_application_publish_folder),
    }),
    timeout=300,
    handler=dotnet_application_entry_point,
    role=role.arn,
    publish=bool(provisioned_concurrent_executions),
    # Versioning required for provisioned concurrency
    environment=aws.lambda_.FunctionEnvironmentArgs(
        variables={
            "COUNTER_TABLE": counter_table.name,
        },
    ),
)

if provisioned_concurrent_executions:
    concurrency = aws.lambda_.ProvisionedConcurrencyConfig("concurrency",
        function_name=lambda_func.name,
        qualifier=lambda_func.version,
        provisioned_concurrent_executions=provisioned_concurrent_executions
    )


#####################
## APIGateway RestAPI
######################

# Create a single Swagger spec route handler for a Lambda function.
def swagger_route_handler(arn):
    return ({
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                "uri": pulumi.Output.format('arn:aws:apigateway:{0}:lambda:path/2015-03-31/functions/{1}/invocations', region, arn),
                "passthroughBehavior": "when_no_match",
                "httpMethod": "POST",
                "type": "aws_proxy",
            },
        },
    })

# Create the API Gateway Rest API, using a swagger spec.
rest_api = aws.apigateway.RestApi("api",
    body=pulumi.Output.json_dumps({
        "swagger": "2.0",
        "info": {"title": "api", "version": "1.0"},
        "paths": {
            "/{proxy+}": lambda_func.arn.apply(swagger_route_handler),
        },
    }))

# Create a deployment of the Rest API.
deployment = aws.apigateway.Deployment("api-deployment",
    rest_api=rest_api.id,
    # Note: Set to empty to avoid creating an implicit stage, we'll create it
    # explicitly below instead.
    stage_name="",
)

# Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
stage = aws.apigateway.Stage("api-stage",
    rest_api=rest_api.id,
    deployment=deployment.id,
    stage_name=custom_stage_name,
)

# Give permissions from API Gateway to invoke the Lambda
invoke_permission = aws.lambda_.Permission("api-lambda-permission",
    action="lambda:invokeFunction",
    function=lambda_func.name,
    principal="apigateway.amazonaws.com",
    source_arn=deployment.execution_arn.apply(lambda arn: arn + "*/*"),
)

# Export the https endpoint of the running Rest API
pulumi.export("endpoint", deployment.invoke_url.apply(lambda url: url + custom_stage_name))
