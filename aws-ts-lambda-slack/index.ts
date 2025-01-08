
// Copyright 2024, Pulumi Corporation. All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const slackWebhookUrl = config.requireSecret("slackWebhookUrl");

// Create an IAM role for the Lambda function
const lambdaRole = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Principal: {
        Service: "lambda.amazonaws.com",
      },
      Effect: "Allow",
    }],
  },
});

// Attach a policy to the role to allow Lambda to log to CloudWatch
const rpa = new aws.iam.RolePolicyAttachment("lambdaRolePolicy", {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
});

// Create the Lambda function
const lambdaFunction = new aws.lambda.Function("myLambda", {
  // https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported
  runtime: "nodejs20.x",
  role: lambdaRole.arn,
  handler: "index.handler",
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("./lambda"),
  }),
  environment: {
    variables: {
      "SLACK_WEBHOOK_URL": slackWebhookUrl,
    },
  },
  memorySize: 128,
  timeout: 30,
  tags: {
    "Environment": "dev",
  },
});

// Export the Lambda function name
// export const lambdaFunctionName = lambdaFunction.name;

// Create an API Gateway
const api = new aws.apigateway.RestApi("myApi", {
  description: "API Gateway for Lambda function",
});


// Create a root resource
const rootResource = api.rootResourceId;

// Create a method for the root resource
const rootMethod = new aws.apigateway.Method("rootMethod", {
  restApi: api.id,
  resourceId: rootResource,
  httpMethod: "ANY",
  authorization: "NONE",
});

// Integrate the Lambda function with the root method
const rootIntegration = new aws.apigateway.Integration("rootIntegration", {
  restApi: api.id,
  resourceId: rootResource,
  httpMethod: rootMethod.httpMethod,
  integrationHttpMethod: "POST",
  type: "AWS_PROXY",
  uri: lambdaFunction.invokeArn,
});

// Grant API Gateway permission to invoke the Lambda function
const lambdaPermission = new aws.lambda.Permission("apiGatewayPermission", {
  action: "lambda:InvokeFunction",
  function: lambdaFunction.arn,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
});

// Deploy the API
const deployment = new aws.apigateway.Deployment("myDeployment", {
  restApi: api.id,
  stageName: "dev",
}, { dependsOn: [rootIntegration] });

// Export the URL of the API
export const url = pulumi.interpolate`${deployment.invokeUrl}`;
