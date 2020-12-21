import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create the role for the Lambda to assume
const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: {
       Version: "2012-10-17",
       Statement: [{
          Action: "sts:AssumeRole",
          Principal: {
             Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
          Sid: "",
       }],
    },
 });

 // Attach the fullaccess policy to the Lambda role created above
 new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaFullAccess,
 });

// Create the Lambda to execute 
const lambda = new aws.lambda.Function("lambdaFunction", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./app"),
     }),
     runtime: "nodejs12.x",
     role: lambdaRole.arn,
     handler: "index.handler",
});

// Give API Gateway permissions to invoke the Lambda
const lambdaPermission = new aws.lambda.Permission("lambdapermission", {
    action: "lambda:InvokeFunction",
    principal: "apigateway.amazonaws.com",
    function: lambda,
});

// Set up the API Gateway
const apigw = new aws.apigatewayv2.Api("httpApiGateway", {
    protocolType: "HTTP",
    routeKey: "GET /",
    target: lambda.invokeArn,
});

export const endpoint = apigw.apiEndpoint;