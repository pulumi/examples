
# re -> regular expression package
import base64
import json
import re

import boto3
import iam
import pulumi
import pulumi_aws as aws

config = pulumi.Config("mentionbot")
slack_token = config.get("slackToken")
verification_token = config.get("verificationToken")

#  Make a simple table that keeps track of which users have requested to be notified when their name
#  is mentioned, and which channel they'll be notified in.
subscriptions_table = aws.dynamodb.Table('subscriptions',
  attributes=[
    aws.dynamodb.TableAttributeArgs(
      name="id",
      type="S",
    )
  ],
  billing_mode="PAY_PER_REQUEST",
  hash_key="id"
)

# Slack has strict requirements on how fast you must be when responding to their messages. In order
# to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
# return immediately.
# message_bus = aws.cloudwatch.EventBus('messages')
# message_bus =

##################
## Lambda Function
##################
# Attach dynamo access to the generic role created in iam.py
lambda_role_policy = aws.iam.RolePolicy('mentionbotDynamoAccessPolicy',
    role=iam.lambda_role.id,
    policy="""{
        "Version": "2012-10-17",
        "Statement": [{
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:DeleteItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
            ],
            "Effect": "Allow",
            "Sid": "dynamoAccess",
            "Resource": "*"
        }]
    }"""
)

# Create a Lambda function, using code from the `./app` folder.
lambda_func = aws.lambda_.Function("mention-processing-lambda",
    role=iam.lambda_role.arn,
    runtime="python3.7",
    handler="mention_processing_lambda.webhook_handler",
    code=pulumi.AssetArchive({
        '.': pulumi.FileArchive('.')
    }),
    environment={
        "variables": {
            'SLACK_TOKEN': slack_token,
            'SLACK_VERIFICATION_CODE': verification_token,
            # TODO: is this "apply" necessary?
            'SUBSCRIPTIONS_TABLE_NAME': subscriptions_table.name.apply(lambda name: name),
        }
    }
)

#############################################
## APIGateway RestAPI
# Provide webhooks for slack to send events
#############################################
region = aws.config.region
custom_stage_name = 'slackbot-example'

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
rest_api = aws.apigateway.RestApi("mentionbot",
    body=pulumi.Output.json_dumps({
        "swagger": "2.0",
        "info": {"title": "slackbot-webhooks", "version": "1.0"},
        "paths": {
            "/{proxy+}": swagger_route_handler(lambda_func.arn),
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