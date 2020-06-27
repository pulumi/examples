"""Copyright 2016-2019, Pulumi Corporation.  All rights reserved."""
import pulumi
import pulumi_aws as aws
import pulumi_aws.config
from pulumi import Output
import json

# The location of the built dotnet3.1 application to deploy
dotnet_application_publish_folder = "./app/bin/Debug/netcoreapp3.1/publish"
dotnet_application_entry_point = "app::app.Functions::GetAsync"
# The stage name to use for the API Gateway URL
custom_stage_name = "api"

#################
## DynamoDB Table
#################

# A DynamoDB table with a single primary key
counter_table = aws.dynamodb.Table("counterTable",
                                   attributes=[
                                       {
                                           "name": "Id",
                                           "type": "S",
                                       },
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
instance_assume_role_policy = aws.iam.get_policy_document(statements=[{
    "actions": ["sts:AssumeRole"],
    "principals": [{
        "identifiers": ["lambda.amazonaws.com"],
        "type": "Service",
    }],
}])

role = aws.iam.Role("mylambda-role",
                    assume_role_policy=instance_assume_role_policy.json,
                    )

policy = aws.iam.RolePolicy("mylambda-policy",
                            role=role,
                            policy=Output.from_input({
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
                            }),
                            )

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
                                   environment={
                                       "variables": {
                                           "COUNTER_TABLE": counter_table.name,
                                       },
                                   },
                                   )

if provisioned_concurrent_executions:
    concurrency = aws.lambda_.ProvisionedConcurrencyConfig("concurrency",
                                                           function_name=lambda_func.name,
                                                           qualifier=lambda_func.version,
                                                           provisioned_concurrent_executions=1
                                                           )


#####################
## APIGateway RestAPI
######################

# Create the Swagger spec for a proxy which forwards all HTTP requests through to the Lambda function.
def swagger_spec(lambda_arn):
    swagger_spec_returns = {
        "swagger": "2.0",
        "info": {"title": "api", "version": "1.0"},
        "paths": {
            "/{proxy+}": swagger_route_handler(lambda_arn),
        },
    }
    return json.dumps(swagger_spec_returns)


# Create a single Swagger spec route handler for a Lambda function.
def swagger_route_handler(lambda_arn):
    region = pulumi_aws.config.region
    uri_string = 'arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{lambdaArn}/invocations'.format(
        region=region, lambdaArn=lambda_arn)
    return ({
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                "uri": uri_string,
                "passthroughBehavior": "when_no_match",
                "httpMethod": "POST",
                "type": "aws_proxy",
            },
        },
    })


# Create the API Gateway Rest API, using a swagger spec.
rest_api = aws.apigateway.RestApi("api",
                                  body=lambda_func.arn.apply(lambda lambda_arn: swagger_spec(lambda_arn)),
                                  )

# Create a deployment of the Rest API.
deployment = aws.apigateway.Deployment("api-deployment",
                                       rest_api=rest_api,
                                       # Note: Set to empty to avoid creating an implicit stage, we'll create it
                                       # explicitly below instead.
                                       stage_name="")

# Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
stage = aws.apigateway.Stage("api-stage",
                             rest_api=rest_api,
                             deployment=deployment,
                             stage_name=custom_stage_name,
                             )

# Give permissions from API Gateway to invoke the Lambda
invoke_permission = aws.lambda_.Permission("api-lambda-permission",
                                           action="lambda:invokeFunction",
                                           function=lambda_func,
                                           principal="apigateway.amazonaws.com",
                                           source_arn=deployment.execution_arn.apply(
                                               lambda execution_arn: execution_arn + "*/*"),
                                           )

# Export the https endpoint of the running Rest API
pulumi.export("endpoint", deployment.invoke_url.apply(lambda url: url + custom_stage_name))
