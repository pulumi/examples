// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const self = new pulumi.StackReference(
  `daniel-pulumi/${pulumi.getProject()}/${pulumi.getStack()}`
);

const handlerFactory = () => {
  const lambda = new aws.sdk.Lambda();
  return async (ev: unknown): Promise<void> => {
    const opponentFunction = process.env.OPPONENT_FN_NAME;
    if (!opponentFunction) {
      return console.log("No one to play against");
    }
    if (Math.random() > 0.5) {
      await lambda
        .invoke({
          FunctionName: opponentFunction,
          InvocationType: "Event",
        })
        .promise();
      console.log(`Returned to ${opponentFunction}`);
    } else {
      console.log(`Missed! ${opponentFunction} wins!`);
    }
  };
};

// const ref = new refs.Placeholder("pong-ref", {
//   value: "",
// });

const ping = new aws.lambda.CallbackFunction(
  "ping",
  {
    callbackFactory: handlerFactory,
    environment: {
      variables: {
        OPPONENT_FN_NAME: self
          .getOutput("pongName")
          .apply((pongName) => pongName ?? ""),
      },
    },
  }
  // { ignoreChanges: ["environment"] }
);

const pong = new aws.lambda.CallbackFunction("pong", {
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: ping.name,
    },
  },
});

// new refs.Override("pong-ref-finalised", {
//   overwrite: ref,
//   value: pong.name,
// });

// const ping = new aws.lambda.CallbackFunction("ping", {
//   name: "ping",
//   role: role,
//   callbackFactory: handlerFactory,
//   environment: {
//     variables: {
//       OPPONENT_FN_NAME: pong.name,
//     },
//   },
// });

export const pingName = ping.name;
export const pongName = pong.name;
