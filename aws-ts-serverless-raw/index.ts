// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// The location of the built dotnet2.0 application to deploy 
let dotNetApplicationPublishFolder = "./app/bin/Debug/netcoreapp2.0/publish";
let dotNetApplicationEntryPoint = "app::app.Functions::GetAsync";
// The stage name to use for the API Gateway URL
let stageName = "api";

///////////////////
// DynamoDB Table
///////////////////

// A DynamoDB table with a single primary key
let counterTable = new aws.dynamodb.Table("counterTable", {
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

// Create a Role giving our Lambda access.
let policy: aws.iam.PolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "lambda.amazonaws.com",
            },
            "Effect": "Allow",
            "Sid": "",
        },
    ],
};
let role = new aws.iam.Role("mylambda-role", {
    assumeRolePolicy: JSON.stringify(policy),
});
let fullAccess = new aws.iam.RolePolicyAttachment("mylambda-access", {
    role: role,
    policyArn: aws.iam.AWSLambdaFullAccess,
});

// Create a Lambda function, using code from the `./app` folder.
let lambda = new aws.lambda.Function("mylambda", {
    runtime: aws.lambda.DotnetCore2d0Runtime,
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive(dotNetApplicationPublishFolder),
    }),
    timeout: 300,
    handler: dotNetApplicationEntryPoint,
    role: role.arn,
    environment: { 
        variables: {
            "COUNTER_TABLE": counterTable.name
        }
    },
}, { dependsOn: [fullAccess] });

///////////////////
// APIGateway RestAPI
///////////////////

// Create the Swagger spec for a proxy which forwards all HTTP requests through to the Lambda function.
function swaggerSpec(lambdaArn: string): string {
    let swaggerSpec = {
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
    let region = aws.config.requireRegion();
    return {
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
                passthroughBehavior: "when_no_match",
                httpMethod: "POST",
                type: "aws_proxy",
            },
        }
    };
}

// Create the API Gateway Rest API, using a swagger spec.
let restApi = new aws.apigateway.RestApi("api", {
    body: lambda.arn.apply(lambdaArn => swaggerSpec(lambdaArn)),
});

// Create a deployment of the Rest API.
let deployment = new aws.apigateway.Deployment("api-deployment", {
    restApi: restApi,
    // Note: Set to empty to avoid creating an implicit stage, we'll create it explicitly below instead.
    stageName: "", 
});

// Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
let stage = new aws.apigateway.Stage("api-stage", { 
    restApi: restApi,
    deployment: deployment,
    stageName: stageName
});

// Give permissions from API Gateway to invoke the Lambda
let invokePermission = new aws.lambda.Permission("api-lambda-permission", {
    action: "lambda:invokeFunction",
    function: lambda,
    principal: "apigateway.amazonaws.com",
    sourceArn: deployment.executionArn.apply(arn => arn + "*/*"),
});

// Export the https endpoint of the running Rest API
export let endpoint = deployment.invokeUrl.apply(url => url + stageName);
