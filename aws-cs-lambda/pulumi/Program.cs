using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Aws.Iam;
using Pulumi.Aws.Lambda;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() =>
        {
            var lambda = new Function("basicLambda", new FunctionArgs
            {
                Runtime = "dotnetcore2.1",
                Code = new FileArchive("../DotnetLambda/src/DotnetLambda/bin/Debug/netcoreapp2.1/publish"),
                Handler = "DotnetLambda::DotnetLambda.Function::FunctionHandler",
                Role = CreateLambdaRole().Arn
            });

            return new Dictionary<string, object> { { "lambda", lambda.Arn } };
        });
    }

    public static Role CreateLambdaRole()
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
            }",
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
