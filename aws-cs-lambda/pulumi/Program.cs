// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.
using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws.Iam;
using Pulumi.Aws.Lambda;
using System.Text.Json.Nodes;

await Deployment.RunAsync(() => 
{
    var lambdaRole = CreateLambdaRole();
    var lambda = new Function("basicLambda", new FunctionArgs
    {
        Runtime = "dotnetcore3.1",
        Code = new FileArchive("../DotnetLambda/src/DotnetLambda/bin/Debug/netcoreapp3.1/publish"),
        Handler = "DotnetLambda::DotnetLambda.Function::FunctionHandler",
        Role = lambdaRole.Arn
    });

    return new Dictionary<string, object?>
    {
        ["lambda"] = lambda.Arn
    };
});

// Helper function to create a lambda role
static Role CreateLambdaRole()
{
    var lambdaRoleJson = new JsonObject 
    {
        ["Version"] = "2012-10-17",
        ["Statement"] = new JsonArray
        {
            new JsonObject 
            {
                ["Action"] = "sts:AssumeRole",
                ["Effect"] = "Allow",
                ["Sid"] = "",
                ["Principal"] = new JsonObject
                {
                    ["Service"] = "lambda.amazonaws.com"
                }
            }
        }
    };

    var lambdaRole = new Role("lambdaRole", new RoleArgs
    {
        AssumeRolePolicy = lambdaRoleJson.ToJsonString()
    });

    var logPolicyJson = new JsonObject
    {
        ["Version"] = "2012-10-17",
        ["Statement"] = new JsonArray
        {
            new JsonObject
            {
                ["Effect"] = "Allow",
                ["Resource"] = "arn:aws:logs:*:*:*",
                ["Action"] = new JsonArray
                {
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                }
            }
        }
    };

    var logPolicy = new RolePolicy("lambdaLogPolicy", new()
    {
        Role = lambdaRole.Id,
        Policy = logPolicyJson.ToJsonString()
    });
    return lambdaRole;
}