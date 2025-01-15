// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import { Runtime } from "@pulumi/aws/lambda";

interface Config {
    language: string;
    handler: string;
    runtime: Runtime;
}

export const lambdaSetup: Config[] = [
    {
        language: "dotnet",
        handler: "DotnetLambda::Lambda.Function::FunctionHandler",
        runtime: Runtime.Dotnet8,
    },
    {
        language: "go",
        handler: "bootstrap",
        runtime: Runtime.CustomAL2023,
    },
    {
        language: "typescript",
        handler: "index.handler",
        runtime: Runtime.NodeJS20dX,
    },
    {
        language: "python",
        handler: "lambda.handler",
        runtime: Runtime.Python3d12,
    },
];
