// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

/**
 * A simple function that returns the request.
 *
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @param {Context} context - Lambda context
 * @returns returns a confirmation to the message
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const route = event.pathParameters?.["route"] || "default";
  const body = event.body ? JSON.parse(event.body) : null;

  console.log("Received body: ", body);

  return {
    statusCode: 200,
    body: JSON.stringify({
      route,
      affirmation: "Nice job, you've done it! :D",
      requestBodyEcho: body,
    }),
  };
};

export default handler;
