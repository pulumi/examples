// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.


import * as aws from "@pulumi/aws";
import * as dockerBuild from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi";
import { lambdaSetup } from "./config";

export = async () => {
    const role = new aws.iam.Role("lambdarole", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.LambdaPrincipal),
        managedPolicyArns: [
            aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
        ],
    });

    const languages = ["dotnet", "go", "python", "typescript"];
    const lambdaNames: {[key: string]: pulumi.Output<string>} = {};

    lambdaSetup.map((lambda) => {
        const buildLambdaCode = new dockerBuild.Image(
            `${lambda.language}-build-code`,
            {
                push: false,
                context: {
                    location: `./${lambda.language}-lambda`,
                },
                dockerfile: {
                    location: `./${lambda.language}-lambda/Dockerfile`,
                },
                exports: [
                    {
                        local: {
                            dest: `./dist/${lambda.language}`,
                        },
                    },
                ],
                labels: {
                    created: new Date().getTime().toString(),
                },
            },
        );

        const fn = new aws.lambda.Function(
            `${lambda.language}-lambda`,
            {
                role: role.arn,
                code: new pulumi.asset.AssetArchive({
                    ".": new pulumi.asset.FileArchive(`./dist/${lambda.language}`),
                }),
                runtime: lambda.runtime,
                handler: lambda.handler,
            },
            { dependsOn: [buildLambdaCode] },
        );

        lambdaNames[`lambdaNames.${lambda.language}`] = fn.name;
    });

    return lambdaNames;
};
