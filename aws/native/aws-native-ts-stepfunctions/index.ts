// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import * as awsnative from "@pulumi/aws-native";
import * as pulumi from "@pulumi/pulumi";

const region = aws.config.requireRegion();

const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({Service: "lambda.amazonaws.com"}),
});

const lambdaRolePolicy = new aws.iam.RolePolicy("lambdaRolePolicy", {
    role: lambdaRole.id,
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            Resource: "arn:aws:logs:*:*:*",
        }],
    },
});

const helloFunction = new awsnative.lambda.Function("helloFunction",
    {
        role: lambdaRole.arn,
        runtime: "nodejs14.x",
        handler: "index.handler",
        code: {
            zipFile: `exports.handler = function(event, context, callback){
                                          const response = {"response": "Hello "};
                                          callback(null, response);
                                        };`,
        },
    }, {dependsOn: lambdaRolePolicy});

const worldFunction = new awsnative.lambda.Function("worldFunction",
    {
        role: lambdaRole.arn,
        runtime: "nodejs14.x",
        handler: "index.handler",
        code: {
            zipFile: `exports.handler = function(event, context, callback){
                                          var response = event.response;
                                          const updated = { "response": response + "World!" };
                                          callback(null, updated);
                                        };`,
        },
    }, {dependsOn: lambdaRolePolicy});


const sfnRole = new aws.iam.Role("sfnRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({Service: `states.${region}.amazonaws.com`}),
});

const sfnRolePolicy = new aws.iam.RolePolicy("sfnRolePolicy", {
    role: sfnRole.id,
    policy: {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: [
                "lambda:InvokeFunction",
            ],
            Resource: "*",
        }],
    },
});

const stateMachine = new awsnative.stepfunctions.StateMachine("stateMachine", {
    roleArn: sfnRole.arn,
    stateMachineType: "EXPRESS",
    definitionString: pulumi.jsonStringify({
        "Comment": "A Hello World example of the Amazon States Language using two AWS Lambda Functions",
        "StartAt": "Hello",
        "States": {
            "Hello": {
                "Type": "Task",
                "Resource": helloFunction.arn,
                "Next": "World",
            },
            "World": {
                "Type": "Task",
                "Resource": worldFunction.arn,
                "End": true,
            },
        },
    },
)}, {dependsOn: sfnRolePolicy});

export const stateMachineArn = stateMachine.id;
