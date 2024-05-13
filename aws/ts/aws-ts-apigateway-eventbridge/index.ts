// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Create an APY Gateway V1 REST API.
const api = new aws.apigateway.RestApi("api");

// Create an event bus.
const bus = new aws.cloudwatch.EventBus("bus");

// Create an event rule to watch for events.
const rule = new aws.cloudwatch.EventRule("rule", {
    eventBusName: bus.name,

    // Specify the event pattern to watch for.
    eventPattern: JSON.stringify({
        source: ["my-event-source"],
    }),
});

// Declare a validator to verify request bodies.
const validator = new aws.apigateway.RequestValidator("validator", {
    restApi: api.id,
    validateRequestBody: true,
});

// Define an API Gateway model.
const model = new aws.apigateway.Model("model", {
    restApi: api.id,
    contentType: "application/json",
    name: "person",
    schema: JSON.stringify({
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "person",
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "The name of the person.",
            },
        },
        required: ["name"],
    }),
});

// Define an API Gateway resource on the API.
const resource = new aws.apigateway.Resource("resource", {
    restApi: api.id,
    pathPart: "uploads",

    // The "parent" is the resource *this* resource belongs to.
    parentId: api.rootResourceId,
});


// Define a method to accept HTTP POSTs on the resource.
const method = new aws.apigateway.Method("method", {
    restApi: api.id,
    httpMethod: "POST",
    resourceId: resource.id,

    // Validate that request bodies also match the shape of the model declared.
    requestValidatorId: validator.id,
    requestModels: {
        "application/json": model.name,
    },

    // Of course, in real life, you almost surely wouldn't want to accept anonymous
    // uploads. This is only meant to keep the example simple and focused on demonstrating
    // an API Gateway V1 integration that also validates request bodies.
    authorization: "NONE",
});

// Define a policy granting API Gateway permission to publish to EventBridge.
const apiGatewayRole = new aws.iam.Role(
    "api-gateway-role",
    {
        assumeRolePolicy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                        Service: "apigateway.amazonaws.com",
                    },
                },
            ],
        },
        managedPolicyArns: [
            "arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess",
        ],
    },
);

// Get the currently configured region from the provider.
const currentRegion = pulumi.output(aws.getRegion());

// Create an API Gateway integration to forward requests to EventBridge.
const integration = new aws.apigateway.Integration("integration", {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: method.httpMethod,
    type: "AWS",
    integrationHttpMethod: "POST",
    uri: pulumi.interpolate`arn:aws:apigateway:${currentRegion.name}:events:action/PutEvents`,
    credentials: apiGatewayRole.arn,
    passthroughBehavior: "WHEN_NO_TEMPLATES",
    requestParameters: {
        "integration.request.header.X-Amz-Target": "'AWSEvents.PutEvents'",
        "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
    },
    requestTemplates: {
        "application/json": pulumi.jsonStringify({
            Entries: [
                {
                    Source: "my-event-source",
                    EventBusName: bus.name,
                    DetailType: "my-detail-type",
                    Detail: "$util.escapeJavaScript($input.body)",
                },
            ],
        },
    )},
});

// Define a method response to return HTTP 201 (created) for successful POSTs.
const methodResponse = new aws.apigateway.MethodResponse("method-response", {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: method.httpMethod,
    statusCode: "201",
});

// Define an integration response that maps EventBridge responses to a custom response status and  an API Gateway status code.
const integrationResponse = new aws.apigateway.IntegrationResponse(
    "integration-response",
    {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,

        // This block states that when EventBridge responds with any 2xx status, we should
        // use our previously defined 201 method response to return some custom JSON.
        selectionPattern: "2\\d{2}",
        statusCode: "201",
        responseTemplates: {
            "application/json": JSON.stringify({ accepted: true }),
        },
    },
    { dependsOn: [integration] },
);

// Define a deployment for the API.
const deployment = new aws.apigateway.Deployment(
    "deployment",
    {
        restApi: api.id,

        // This bit of magic states that whenever any of the properties defined under
        // `deployment` below changes, API Gateway should perform a redeployment (i.e.,
        // update the endpoint). Be sure to list any properties here that you'd want to
        // cause a redeployment. (API Gateway V2 makes this a lot easier with the
        // `autoDeploy` property exposed on V2 Stage resources.)

        // If this property is not defined, or is defined in a way that doesn't result in
        // a diff, no redeployment will happen. More info is available in the provider docs:
        // https://www.pulumi.com/registry/packages/aws/api-docs/apigateway/deployment/#triggers_python
        // https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment#triggers
        triggers: {
            // The property name ("deployment") isn't relevant here; it can actually be anything you like.
            deployment:
                // Stringify the array of properties to create a diff (triggering
                // a redeployment) if/when one of the properties listed changes.
                pulumi.jsonStringify([
                    resource.id,
                    method.id,
                    integration.requestTemplates,
                    integrationResponse.responseTemplates,
                    method.requestValidatorId,
                ]),
        },
    },
);

// Create a stage with the deployment.
const stage = new aws.apigateway.Stage("stage", {
    restApi: api.id,
    deployment: deployment.id,
    stageName: "dev",
});

// Create a Lambda function handler with permission to log to CloudWatch.
const lambda = new aws.lambda.CallbackFunction("lambda", {
    policies: [aws.iam.ManagedPolicies.CloudWatchLogsFullAccess],
    callback: async (event: any) => {

        // For now, just log the event, including the uploaded document.
        // That'll be enough to verify everything's working.
        console.log({ source: event.source, detail: event.detail });
    },
});

// Create an EventBridge target associating the event rule with the function.
const lambdaTarget = new aws.cloudwatch.EventTarget("lambda-target", {
    arn: lambda.arn,
    rule: rule.name,
    eventBusName: bus.name,
});

// Give EventBridge permission to invoke the function.
const lambdaPermission = new aws.lambda.Permission("lambda-permission", {
    action: "lambda:InvokeFunction",
    principal: "events.amazonaws.com",
    function: lambda.arn,
    sourceArn: rule.arn,
});

// Export the API Gateway URL to give us something to POST to.
export const url = stage.invokeUrl;
