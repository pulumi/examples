// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import events = require("@aws-cdk/aws-events");
import targets = require("@aws-cdk/aws-events-targets");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import fs = require("fs");
import { CDKStack } from "./cdk";

// A CDK Stack which can use any resources from the CDK Construct library.
class LambdaCronStack extends cdk.Stack {
    constructor(app: cdk.App, id: string) {
        super(app, id);

        const lambdaFn = new lambda.Function(this, "Singleton", {
            code: new lambda.InlineCode(fs.readFileSync("./app/lambda-handler.py", { encoding: "utf-8" })),
            handler: "index.main",
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6,
        });

        const rule = new events.Rule(this, "Rule", {
            schedule: events.Schedule.expression("cron(0 18 ? * MON-FRI *)"),
        });

        rule.addTarget(new targets.LambdaFunction(lambdaFn));
    }
}

// Instantiate the CDK Stack as a Pulumi resource.
const stack = new CDKStack("lambdaCron", LambdaCronStack);
export const stackId = stack.cloudformationStack.id;
