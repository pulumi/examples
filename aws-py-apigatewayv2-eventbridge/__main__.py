# Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import json
import pulumi
import pulumi_aws as aws

# Create an HTTP API.
api = aws.apigatewayv2.Api("example",
    protocol_type="HTTP"
)

# Create a stage and set it to deploy automatically.
stage = aws.apigatewayv2.Stage("stage",
    api_id=api.id,
    name=pulumi.get_stack(),
    auto_deploy=True
)

# Create an event bus.
bus = aws.cloudwatch.EventBus("bus")

# Create an event rule to watch for events.
rule = aws.cloudwatch.EventRule("rule",
    event_bus_name=bus.name,
    event_pattern=json.dumps({"source": ["my-event-source"]})
)

# Define a policy granting API Gateway permission to publish to EventBridge.
api_gateway_role = aws.iam.Role("api-gateway-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                    "Service": "apigateway.amazonaws.com",
                },
            },
        ],
    }),
    managed_policy_arns=[
        "arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess",
    ],
)

# Create an API Gateway integration to forward requests to EventBridge.
integration = aws.apigatewayv2.Integration("integration",
    api_id=api.id,

    # The integration type and subtype.
    integration_type="AWS_PROXY",
    integration_subtype="EventBridge-PutEvents",
    credentials_arn=api_gateway_role.arn,

    # The body of the request to be sent to EventBridge. Note the
    # event source matches pattern defined on the EventRule, and the
    # Detail expression, which just forwards the body of the original
    # API Gateway request (i.e., the uploaded document).
    request_parameters={
        "EventBusName": bus.name.apply(lambda name: name),
        "Source": "my-event-source",
        "DetailType": "my-detail-type",
        "Detail": "$request.body",
    },
)

# Finally, define the route.
route = aws.apigatewayv2.Route("route",
    api_id=api.id,
    route_key="POST /uploads",
    target=integration.id.apply(lambda id: f"integrations/{id}"),
)

# Define a role and policy allowing Lambda functions to log to CloudWatch.
lambda_role = aws.iam.Role("lambda-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "sts:AssumeRole",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Effect": "Allow"
            }
        ]
    })
)
lambda_role_policy = aws.iam.RolePolicy("lambda-role-policy",
    role=lambda_role.id,
    policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }]
    })
)

# Create a Lambda function handler.
lambda_function = aws.lambda_.Function("lambda",
    role=lambda_role.arn,
    runtime="python3.7",
    handler="handlers.capture_order",
    code=pulumi.AssetArchive({
        ".": pulumi.FileArchive('./api')
    })
)

# Create an EventBridge target associating the event rule with the function.
lambda_target = aws.cloudwatch.EventTarget("lambda-target",
    arn=lambda_function.arn,
    rule=rule.name,
    event_bus_name=bus.name,
)

# Give EventBridge permission to invoke the function.
lambda_permission = aws.lambda_.Permission("lambda-permission",
    action="lambda:InvokeFunction",
    principal="events.amazonaws.com",
    function=lambda_function.arn,
    source_arn=rule.arn,
)

# Export the API Gateway URL to give us something to POST to.
pulumi.export("url", pulumi.Output.concat(api.api_endpoint, "/", stage.name))

