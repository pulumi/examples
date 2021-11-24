// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";
import { APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";

export const authLambda = new aws.lambda.CallbackFunction<APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult>("auth", {
    callback: async (event, context) => {
        if (event.type !== "REQUEST") {
            throw new Error("Unexpected authorization type");
        }
        // --- Add your own custom authorization logic here. ---
        const effect = (event.headers?.Authorization === "goodToken") ? "Allow" : "Deny";
        return {
            principalId: "my-user",
            policyDocument: {
                Version: "2012-10-17",
                Statement: [{
                    Action: "execute-api:Invoke",
                    Effect: effect,
                    Resource: event.methodArn,
                }],
            },
        };
    },
});
