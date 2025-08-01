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
        var provider = new Aws.Provider("privileged", new Aws.ProviderArgs
        {
            AssumeRoles = new Aws.Inputs.ProviderAssumeRoleArgs[]
            {
                new Aws.Inputs.ProviderAssumeRoleArgs
                {
                    RoleArn = roleToAssumeARN,
                    SessionName = "PulumiSession",
                    ExternalId = "PulumiApplication"
                }
            },
            Region = awsConfig.Require("region"),
        });
        var bucket = new Aws.S3.BucketV2("myBucket", null, new CustomResourceOptions { Provider = provider });
        this.BucketName = bucket.Bucket;
    }

    [Output]
    public Output<string> BucketName { get; set; }
}
