using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Aws.Lambda;
using Pulumi.Aws.Iam;

class LambdaUtil
{
    public static Pulumi.AssetArchive buildArchive(string lambdaArchivePath)
    {
        var immutableDictBuilder = System.Collections.Immutable.ImmutableDictionary.CreateBuilder<string, AssetOrArchive>();
        immutableDictBuilder.Add(".", new FileArchive(lambdaArchivePath));
        return new Pulumi.AssetArchive(immutableDictBuilder.ToImmutable());
    }
    public static Role createLambdaRole()
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

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() =>
        {
            var lambda = new Function("basicLambda", new FunctionArgs
            {
                Runtime = "dotnetcore2.1",
                Code = LambdaUtil.buildArchive("../dotnetLambda/src/dotnetLambda//bin/Debug/netcoreapp2.1/publish"),
                Handler = "dotnetLambda::dotnetLambda.Function::FunctionHandler",
                Role = LambdaUtil.createLambdaRole().Arn
            });

            return new Dictionary<string, object>{
                {"lambda", lambda.Arn}
            };
        });
    }
}
