import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { handlerFactory } from "./handlerFactory";

const pongStateName = new pulumi.State("pong-name", {
  value: "",
});

const ping = new aws.lambda.CallbackFunction("ping", {
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: pongStateName.value,
    },
  },
});

const pong = new aws.lambda.CallbackFunction("pong", {
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: ping.name,
    },
  },
});

// Engine re-runs "up" if this changes the value
pongStateName.set({
  value: pong.name,
});

export const pingName = ping.name;
export const pongName = pong.name;
