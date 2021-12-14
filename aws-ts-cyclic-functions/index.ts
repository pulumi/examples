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

const initialPing = new aws.lambda.CallbackFunction(
  "ping",
  {
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
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: initialPing.name,
    },
  },
});

const ping = new aws.lambda.CallbackFunction("ping", {
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
