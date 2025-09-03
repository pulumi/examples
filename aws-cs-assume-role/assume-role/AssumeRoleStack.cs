using System;
using Pulumi;
using Aws = Pulumi.Aws;
using Input = Pulumi.Aws.Inputs;
using AwsConfig = Pulumi.Aws.Config;


class AssumeRoleStack : Stack
{
    public AssumeRoleStack()
    {
        var awsConfig = new Pulumi.Config("aws");
        var config = new Pulumi.Config();
        var roleToAssumeARN = config.Require("roleToAssumeARN");
        var isPreview = Deployment.Instance.IsDryRun;
        if (!isPreview && roleToAssumeARN.StartsWith("arn:aws:iam::123456789012:role/preview-"))
        {
            throw new Exception("Configure a real roleToAssumeARN before 'pulumi up'. Example: pulumi config set aws-cs-assume-role:roleToAssumeARN arn:aws:iam::<account>:role/<roleName>");
        }
        var baseArgs = new Aws.ProviderArgs
        {
            Region = awsConfig.Require("region"),
        };
        var provider = new Aws.Provider("privileged",
            isPreview
                ? baseArgs
                : new Aws.ProviderArgs
                {
                    Region = baseArgs.Region,
                    AssumeRoles = new Aws.Inputs.ProviderAssumeRoleArgs[]
                    {
                        new Aws.Inputs.ProviderAssumeRoleArgs
                        {
                            RoleArn = roleToAssumeARN,
                            SessionName = "PulumiSession",
                            ExternalId = "PulumiApplication"
                        }
                    },
                }
        );
        var bucket = new Aws.S3.Bucket("myBucket", null, new CustomResourceOptions { Provider = provider });
        this.BucketName = bucket.Id;
    }

    [Output]
    public Output<string> BucketName { get; set; }
}
