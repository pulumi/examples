// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// The location of the built dotnet3.1 application to deploy
const dotNetApplicationPublishFolder = "./app/bin/Debug/net6.0/publish";
const dotNetApplicationEntryPoint = "app::app.Functions::GetAsync";
// The stage name to use for the API Gateway URL
const stageName = "api";

///////////////////
// DynamoDB Table
///////////////////

// A DynamoDB table with a single primary key
const counterTable = new aws.dynamodb.Table("counterTable", {
    attributes: [
        { name: "Id", type: "S" },
    ],
    hashKey: "Id",
    readCapacity: 1,
    writeCapacity: 1,
});

///////////////////
// Lambda Function
///////////////////

// Give our Lambda access to the Dynamo DB table, CloudWatch Logs and Metrics.
const role = new aws.iam.Role("mylambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});

const policy = new aws.iam.RolePolicy("mylambda-policy", {
    role,
    policy: pulumi.output({
        Version: "2012-10-17",
        Statement: [{
            Action: ["dynamodb:UpdateItem", "dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:DescribeTable"],
            Resource: counterTable.arn,
            Effect: "Allow",
        }, {
            Action: ["logs:*", "cloudwatch:*"],
            Resource: "*",
            Effect: "Allow",
        }],
    }),
});

// Read the config of whether to provision fixed concurrency for Lambda
const config = new pulumi.Config();
const provisionedConcurrentExecutions = config.getNumber("provisionedConcurrency");

// Create a Lambda function, using code from the `./app` folder.
const lambda = new aws.lambda.Function("mylambda", {
    runtime: aws.lambda.DotnetCore3d1Runtime,
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive(dotNetApplicationPublishFolder),
    }),
    timeout: 300,
    handler: dotNetApplicationEntryPoint,
    role: role.arn,
    publish: !!provisionedConcurrentExecutions, // Versioning required for provisioned concurrency
    environment: {
        variables: {
            "COUNTER_TABLE": counterTable.name,
        },
    },
}, { dependsOn: [policy] });

if (provisionedConcurrentExecutions) {
    const concurrency = new aws.lambda.ProvisionedConcurrencyConfig("concurrency", {
        functionName: lambda.name,
        qualifier: lambda.version,
        provisionedConcurrentExecutions,
    });
}

///////////////////
// APIGateway RestAPI
///////////////////

// Create the Swagger spec for a proxy which forwards all HTTP requests through to the Lambda function.
function swaggerSpec(lambdaArn: string): string {
    const swaggerSpec = {
        swagger: "2.0",
        info: { title: "api", version: "1.0" },
        paths: {
            "/{proxy+}": swaggerRouteHandler(lambdaArn),
        },
    };
    return JSON.stringify(swaggerSpec);
}

// Create a single Swagger spec route handler for a Lambda function.
function swaggerRouteHandler(lambdaArn: string) {
    const region = aws.config.requireRegion();
    return {
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
                passthroughBehavior: "when_no_match",
                httpMethod: "POST",
                type: "aws_proxy",
            },
        },
    };
}

// Create the API Gateway Rest API, using a swagger spec.
const restApi = new aws.apigateway.RestApi("api", {
    body: lambda.arn.apply(lambdaArn => swaggerSpec(lambdaArn)),
});

// Create a deployment of the Rest API.
const deployment = new aws.apigateway.Deployment("api-deployment", {
    restApi: restApi,
    // Note: Set to empty to avoid creating an implicit stage, we'll create it explicitly below instead.
    stageName: "",
});

// Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
const stage = new aws.apigateway.Stage("api-stage", {
    restApi: restApi,
    deployment: deployment,
    stageName: stageName,
});

// Give permissions from API Gateway to invoke the Lambda
const invokePermission = new aws.lambda.Permission("api-lambda-permission", {
    action: "lambda:invokeFunction",
    function: lambda,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate `${deployment.executionArn}*/*`,
});

// Export the https endpoint of the running Rest API
export let endpoint = pulumi.interpolate `${deployment.invokeUrl}${stageName}`;
