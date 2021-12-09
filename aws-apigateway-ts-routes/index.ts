// Copyright 2016-2021, Pulumi Corporation.
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import * as pulumi from "@pulumi/pulumi";
import { configureDns } from "./dns";
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
        // Use Swagger to define an HTTP proxy route
        {
            path: "swagger",
            method: "GET",
            data: {
                "x-amazon-apigateway-integration": {
                    httpMethod: "GET",
                    passthroughBehavior: "when_no_match",
                    type: "http_proxy",
                    uri: "https://httpbin.org/uuid",
                },
            },
        },
        // Authorize requests using Cognito
        {
            path: "cognito-authorized",
            method: "GET",
            eventHandler: helloHandler,
            // Use Cognito as authorizer to validate the token from the Authorization header
            authorizers: [
                {
                    parameterName: "Authorization",
                    identitySource: ["method.request.header.Authorization"],
                    providerARNs: [userPool.arn],
                },
            ],
        },
        // Authorize requests using a Lambda function
        {
            path: "lambda-authorized",
            method: "GET",
            eventHandler: helloHandler,
            // Use Lambda authorizer to validate the token from the Authorization header
            authorizers: [
                {
                    authType: "custom",
                    parameterName: "Authorization",
                    type: "request",
                    identitySource: ["method.request.header.Authorization"],
                    handler: authLambda,
                },
            ],
        },
        // Track and limit requests with API Keys
        {
            path: "key-authorized",
            method: "GET",
            eventHandler: helloHandler,
            apiKeyRequired: true,
        },
    ],
});

// Define whole API using swagger (OpenAPI)
const swaggerAPI = new apigateway.RestAPI("swagger-api", {
    swaggerString: JSON.stringify({
        swagger: "2.0",
        info: {
            title: "example",
            version: "1.0",
        },
        paths: {
            "/": {
                get: {
                    "x-amazon-apigateway-integration": {
                        httpMethod: "GET",
                        passthroughBehavior: "when_no_match",
                        type: "http_proxy",
                        uri: "https://httpbin.org/uuid",
                    },
                },
            },
        },
        "x-amazon-apigateway-binary-media-types": ["*/*"],
    }),
});

// Create an API key to manage usage
const apiKey = new aws.apigateway.ApiKey("api-key");
// Define usage plan for an API stage
const usagePlan = new aws.apigateway.UsagePlan("usage-plan", {
    apiStages: [{
        apiId: api.api.id,
        stage: api.stage.stageName,
        // throttles: [{ path: "/path/GET", rateLimit: 1 }]
    }],
    // quotaSettings: {...},
    // throttleSettings: {...},
});
// Associate the key to the plan
// tslint:disable-next-line:no-unused-expression
new aws.apigateway.UsagePlanKey("usage-plan-key", {
    keyId: apiKey.id,
    keyType: "API_KEY",
    usagePlanId: usagePlan.id,
});

// Set up DNS if a domain name has been configured
const config = new pulumi.Config();
const domain = config.get("domain");
export let customUrl: pulumi.Output<string> | undefined;
if (domain !== undefined) {
    // Load DNS zone for the domain
    const zone = aws.route53.getZoneOutput({ name: config.require("dns-zone") });
    // Create SSL Certificate and DNS entries
    const apiDomainName = configureDns(domain, zone.zoneId);
    // Tell API Gateway what to serve on our custom domain
    const basePathMapping = new aws.apigateway.BasePathMapping(
        "api-domain-mapping",
        {
            restApi: api.api.id,
            stageName: api.stage.stageName,
            domainName: apiDomainName.domainName,
        },
    );
    customUrl = pulumi.interpolate`https://${basePathMapping.domainName}/`;
}

export const url = api.url;
export const userPoolId = userPool.id;
export const userPoolClientId = userPoolClient.id;
export const swaggerUrl = swaggerAPI.url;
export const apiKeyValue = apiKey.value;
