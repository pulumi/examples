// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Aws.Iam;
using Pulumi.Aws.Lambda;

class LambdaStack : Stack
{
    public LambdaStack()
    {
        var lambda = new Function("basicLambda", new FunctionArgs
        {
            Runtime = "dotnetcore3.1",
            Code = new FileArchive("../DotnetLambda/src/DotnetLambda/bin/Debug/net6.0/publish"),
            Handler = "DotnetLambda::DotnetLambda.Function::FunctionHandler",
            Role = CreateLambdaRole().Arn
        });

        this.Lambda = lambda.Arn;
    }

    [Output] public Output<string> Lambda { get; set; }

    private static Role CreateLambdaRole()
    {
        var lambdaRole = new Role("lambdaRole", new RoleArgs
        {
            AssumeRolePolicy =
                @"{
                ""Version"": ""2012-10-17"",
                ""Statement"": [
                    {
                        ""Action"": ""sts:AssumeRole"",
                        ""Principal"": {
                            ""Service"": ""lambda.amazonaws.com""
                        },
                        ""Effect"": ""Allow"",
                        ""Sid"": """"
                    }
                ]
            }"
        });

        var logPolicy = new RolePolicy("lambdaLogPolicy", new RolePolicyArgs
        {
            Role = lambdaRole.Id,
            Policy =
                @"{
                ""Version"": ""2012-10-17"",
                ""Statement"": [{
                    ""Effect"": ""Allow"",
                    ""Action"": [
                        ""logs:CreateLogGroup"",
                        ""logs:CreateLogStream"",
                        ""logs:PutLogEvents""
                    ],
                    ""Resource"": ""arn:aws:logs:*:*:*""
                }]
            }"
        });

        return lambdaRole;
    }
}
