// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import * as pulumi from "@pulumi/pulumi";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import handler from "./handler";

/**
 * api-gateway https://www.pulumi.com/docs/guides/crosswalk/aws/api-gateway/
 */

// Create Lambda functions for our API
const handlerFunction = new aws.lambda.CallbackFunction("get-handler", {
  callback: handler,
  runtime: aws.lambda.Runtime.NodeJS18dX,
});

const postHandlerFunction = new aws.lambda.CallbackFunction("post-handler", {
  callback: async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Inline event handler");
    console.log(event);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "POST successful" }),
    };
  },
  runtime: aws.lambda.Runtime.NodeJS18dX,
});

const deleteHandlerFunction = new aws.lambda.CallbackFunction("delete-handler", {
  callback: async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "DELETE successful" }),
    };
  },
  runtime: aws.lambda.Runtime.NodeJS18dX,
});

// Create an API endpoint.
const endpoint = new apigateway.RestAPI("hello-world", {
  routes: [
    {
      path: "/{route+}",
      method: "GET",
      // Use the Lambda function reference for the event handler
      eventHandler: handlerFunction,
    },
    {
      path: "/{route+}",
      method: "POST",
      eventHandler: postHandlerFunction,
    },
    {
      path: "/{route+}",
      method: "DELETE",
      eventHandler: deleteHandlerFunction,
    },
  ],
});

// Pulumi exports values
// See these outputs using: pulumi stack output endpointUrl
export const endpointUrl = endpoint.url;



