using Pulumi;
using Iam = Pulumi.Aws.Iam;
using Log = Pulumi.Log;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

class CreateRoleStack : Stack
{
    public CreateRoleStack()
    {
        var config = new Pulumi.Config();
        var unprivilegedUsername = config.Require("unprivilegedUsername");

        var unprivilegedUser = new Iam.User("unprivilegedUser", new Iam.UserArgs
        {
            Name = unprivilegedUsername,
        });

        var unprivilegedUserCreds = new Iam.AccessKey("unprivileged-user-key", new Iam.AccessKeyArgs
        {
            User = unprivilegedUser.Name,
        },
        // additional_secret_outputs specify properties that must be encrypted as secrets
        // https://www.pulumi.com/docs/intro/concepts/resources/#additionalsecretoutputs
        new CustomResourceOptions { AdditionalSecretOutputs = { "secret" } });

        AssumeRolePolicyArgs policyArgs = new AssumeRolePolicyArgs(unprivilegedUser.Arn);
        var tempPolicy = Output.Create(policyArgs).Apply(args => JsonSerializer.Serialize(args,
            new JsonSerializerOptions
            {
                WriteIndented = false,
                PropertyNamingPolicy = null // Remove camelCase policy
            }));

        // Alternative approach using a direct string-based policy document
        var directPolicy = unprivilegedUser.Arn.Apply(arn => @$"{{
            ""Version"": ""2012-10-17"",
            ""Statement"": [
                {{
                    ""Sid"": ""AllowAssumeRole"",
                    ""Effect"": ""Allow"",
                    ""Principal"": {{
                        ""AWS"": ""{arn}""
                    }},
                    ""Action"": ""sts:AssumeRole""
                }}
            ]
        }}");

        var allowS3ManagementRole = new Iam.Role("allow-s3-management", new Iam.RoleArgs
        {
            Description = "Allow management of S3 buckets",
            AssumeRolePolicy = directPolicy // Use the direct string approach instead
        });

        var rolePolicy = new Iam.RolePolicy("allow-s3-management-policy", new Iam.RolePolicyArgs
        {
            Role = allowS3ManagementRole.Name,
            Policy =
                @"{
                ""Version"": ""2012-10-17"",
                ""Statement"": [{
                    ""Effect"": ""Allow"",
                    ""Action"": ""s3:*"",
                    ""Resource"": ""*"",
                    ""Sid"": ""allowS3Access""
                }]
            }"
        },
        new CustomResourceOptions { Parent = allowS3ManagementRole }
        );
        this.roleArn = allowS3ManagementRole.Arn;
        this.accessKeyId = unprivilegedUserCreds.Id;
        this.secretAccessKey = unprivilegedUserCreds.Secret;
    }

    public class AssumeRolePolicyArgs
    {
        [JsonPropertyName("Version")]
        public string Version => "2012-10-17";

        [JsonPropertyName("Statement")]
        public StatementArgs[] Statement { get; private set; }

        public AssumeRolePolicyArgs(Input<string> arn)
        {
            Statement = new StatementArgs[] { new StatementArgs(arn) };
        }
    }

    public class StatementArgs
    {
        [JsonPropertyName("Sid")]
        public string Sid => "AllowAssumeRole";

        [JsonPropertyName("Effect")]
        public string Effect => "Allow";

        [JsonPropertyName("Principal")]
        public PrincipalArgs Principal { get; private set; }

        [JsonPropertyName("Action")]
        public string Action => "sts:AssumeRole";

        public StatementArgs(Input<string> arn)
        {
            Principal = new PrincipalArgs(arn);
        }
    }

    public class PrincipalArgs
    {
        [JsonPropertyName("AWS")]
        public Input<string> AWS { get; private set; }

        public PrincipalArgs(Input<string> arn)
        {
            AWS = arn;
        }
    }

    [Output]
    public Output<string> roleArn { get; set; }
    [Output]
    public Output<string> accessKeyId { get; set; }
    [Output]
    public Output<string> secretAccessKey { get; set; }


}
