// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

const handlerFactory = () => {
  const lambda = new aws.sdk.Lambda();
  return (ev: unknown): void => {
    const opponentFunction = process.env.OPPONENT_FN_NAME;
    if (!opponentFunction) {
      return console.log("No one to play against");
    }
    if (Math.random() > 0.5) {
      lambda.invoke({
        FunctionName: opponentFunction,
        InvocationType: "Event",
      });
      console.log(`Returned to ${opponentFunction}`);
    } else {
      console.log(`Missed! ${opponentFunction} wins!`);
    }
  };
};

const role = new aws.iam.Role("lambda-role", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowAssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  },
  inlinePolicies: [
    {
      policy: JSON.stringify({
        Statement: [
          {
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            Effect: "Allow",
            Resource: "arn:aws:logs:*:*:*",
          },
        ],
        Version: "2012-10-17",
      }),
    },
  ],
});

const initialPing = new aws.lambda.CallbackFunction(
  "ping",
  {
    role: role,
    callbackFactory: handlerFactory,
    environment: {
      variables: {
        OPPONENT_FN_NAME: "",
      },
    },
  },
  { ignoreChanges: ["environment"] }
);

const pong = new aws.lambda.CallbackFunction("pong", {
  role: role,
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: initialPing.name,
    },
  },
});

const ping = new aws.lambda.CallbackFunction("ping", {
  role: role,
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: pong.name,
    },
  },
});

// Export the name of the bucket
export const pingName = ping.name;
export const pongName = pong.name;
