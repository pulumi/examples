// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * A simple function that returns the request.
 *
 * @param {APIGatewayProxyEvent} event -
 * @returns returns a confirmation to the message to the
 */
export const handler: aws.lambda.EventHandler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event) => {
  const route = event.pathParameters!["route"];
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
