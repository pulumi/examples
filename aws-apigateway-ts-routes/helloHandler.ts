// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";

// Create a Lambda function to respond to HTTP requests
export const helloHandler = new aws.lambda.CallbackFunction("hello-handler", {
    callback: async (ev, ctx) => {
        console.log(JSON.stringify(ev));
        return {
            statusCode: 200,
            body: "Hello, API Gateway!",
        };
    },
});
