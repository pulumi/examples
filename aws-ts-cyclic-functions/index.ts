// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsnative from "@pulumi/aws-native";

// const handlerFactory = () => {
//   const lambda = new aws.sdk.Lambda();
//   return (ev: unknown): void => {
//     const opponentFunction = process.env.OPPONENT_FN_NAME;
//     if (!opponentFunction) {
//       return console.log("No one to play against");
//     }
//     if (Math.random() > 0.5) {
//       lambda.invoke({
//         FunctionName: opponentFunction,
//         InvocationType: "Event",
//       });
//       console.log(`Returned to ${opponentFunction}`);
//     } else {
//       console.log(`Missed! ${opponentFunction} wins!`);
//     }
//   };
// };

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

const functionArgs = {
  role: role.arn,
  runtime: "nodejs14.x",
  handler: "index.handler",
  code: {
      zipFile: `
      exports.handler = function(event, context, callback){
        callback(null, "TODO");
      };`,
    },
};

const initialPing = new awsnative.lambda.Function("ping", {
  ...functionArgs,
  functionName: "ping-name",
  environment: {
    variables: {
      OPPONENT_FN_NAME: "",
    },
  },
}, { ignoreChanges: ["environment"] } );

const pong = new awsnative.lambda.Function("pong", {
  ...functionArgs,
  environment: {
    variables: {
      OPPONENT_FN_NAME: initialPing.functionName,
    },
  },
});

const ping = new awsnative.lambda.Function("ping", {
  ...functionArgs,
  functionName: "ping-name",
  environment: {
    variables: {
      OPPONENT_FN_NAME: pong.functionName,
    },
  },
});

// Export the name of the function
export const pongName = pong.functionName;
