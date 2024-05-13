// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { readFileSync } from "fs";

const region = aws.config.requireRegion();

const lambdaRole = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
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

const sfnRole = new aws.iam.Role("sfnRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: `states.${region}.amazonaws.com` }),
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

const helloFunction = new aws.lambda.CallbackFunction(
  "helloFunction", {
  role: lambdaRole,
  callback: (event, context, callback) => {
    callback(null, "Hello");
  },
});

const worldFunction = new aws.lambda.CallbackFunction(
  "worldFunction", {
  role: lambdaRole,
  callback: (event, context, callback) => {
    callback(null, `${event} World!`);
  },
});

const stateMachine = new aws.sfn.StateMachine("stateMachine", {
  roleArn: sfnRole.arn,
  definition: pulumi.jsonStringify({
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
  )});

export const stateMachineArn = stateMachine.id;
export const readme = readFileSync("./Pulumi.README.md").toString();
