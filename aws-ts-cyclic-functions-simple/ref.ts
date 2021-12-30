import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { handlerFactory } from "./handlerFactory";

const pongRefName = new pulumi.Ref("pong-name", {
  value: "",
});

const ping = new aws.lambda.CallbackFunction("ping", {
  callbackFactory: handlerFactory,
  environment: {
    variables: {
      OPPONENT_FN_NAME: pongRefName, // Serialized to the engine
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

// Sends RPC message to determine affected resources and re-update
pongRefName.set({
  value: pong.name,
});

export const pingName = ping.name;
export const pongName = pong.name;
// Still resolves to the old value
export const pingEnv = ping.environment.variables;
