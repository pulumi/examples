import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stack = pulumi.getStack();

const lambdaRole = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Effect: "Allow",
        Sid: "",
      },
    ],
  },
});

new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
  role: lambdaRole,
  policyArn: aws.iam.ManagedPolicies.AWSLambdaFullAccess,
});

const lambda = new aws.lambda.Function("lambdaFunction", {
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("./app"),
  }),
  runtime: "nodejs12.x",
  role: lambdaRole.arn,
  handler: "index.handler",
});

const apigw = new aws.apigatewayv2.Api("httpApiGateway", {
  protocolType: "HTTP",
});

new aws.lambda.Permission("lambdaPermission", {
  action: "lambda:InvokeFunction",
  principal: "apigateway.amazonaws.com",
  function: lambda,
  sourceArn: pulumi.interpolate`${apigw.executionArn}/*/*`,
}, {dependsOn: [apigw, lambda]});

const integration = new aws.apigatewayv2.Integration("lambdaIntegration", {
  apiId: apigw.id,
  integrationType: "AWS_PROXY",
  integrationUri: lambda.arn,
  integrationMethod: "POST",
  payloadFormatVersion: "2.0",
  passthroughBehavior: "WHEN_NO_MATCH"
});

const route = new aws.apigatewayv2.Route("apiRoute", {
  apiId: apigw.id,
  routeKey: "$default",
  target: pulumi.interpolate`integrations/${integration.id}`,
});

const stage = new aws.apigatewayv2.Stage("apiStage", {
  apiId: apigw.id,
  name: stack,
  routeSettings: [
    {
      routeKey: route.routeKey,
      throttlingBurstLimit: 5000,
      throttlingRateLimit: 10000
    },
  ],
  autoDeploy: true,
  
}, {dependsOn: [route]});

export const endpoint = pulumi.interpolate`${apigw.apiEndpoint}/${stage.name}`;