// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { helloHandler } from "./helloHandler";
import { authLambda } from "./lambdaAuthorizer";

// Create a Cognito User Pool of authorized users
const userPool = new aws.cognito.UserPool("user-pool");
const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
    userPoolId: userPool.id,
    explicitAuthFlows: ["ADMIN_NO_SRP_AUTH"],
});

const api = new apigateway.RestAPI("api", {
    routes: [
        // Serve an entire directory of static content
        {
            path: "static",
            localPath: "www",
        },
        // Invoke our Lambda to handle a single route
        {
            path: "lambda", // Tip: To handle all sub-paths use `/{proxy+}` as the path
            method: "GET",
            // Policies will be created automatically to allow API Gateway to invoke the Lambda
            eventHandler: helloHandler,
        },
        // Proxy requests to another service
        {
            path: "proxy",
            target: {
                type: "http_proxy",
                uri: "https://www.google.com",
            },
        },
        // Authorize requests using Cognito
        {
            path: "cognito-authorized",
            method: "GET",
            eventHandler: helloHandler,
            // Use Cognito as authorizer to validate the token from the Authorization header
            authorizers: [{
                parameterName: "Authorization",
                identitySource: ["method.request.header.Authorization"],
                providerARNs: [userPool.arn],
            }],
        },
        // Authorize requests using a Lambda function
        {
            path: "lambda-authorized",
            method: "GET",
            eventHandler: helloHandler,
            // Use Lambda authorizer to validate the token from the Authorization header
            authorizers: [{
                authType: "custom",
                parameterName: "Authorization",
                type: "request",
                identitySource: ["method.request.header.Authorization"],
                handler: authLambda,
            }],
        },
    ],
});

export const url = api.url;
export const userPoolId = userPool.id;
export const userPoolClientId = userPoolClient.id;
