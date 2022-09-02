// Copyright 2016-2022, Pulumi Corporation.
using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws;
using Pulumi.Aws.Inputs;
using Pulumi.Aws.S3;

await Deployment.RunAsync(() =>
{
    var awsConfig = new Pulumi.Config("aws");
    var config = new Pulumi.Config();
    var roleToAssumeArn = config.Require("roleToAssumeARN");
    var provider = new Provider("privileged", new ProviderArgs
    {
        Region = awsConfig.Require("region"),
        AssumeRole = new ProviderAssumeRoleArgs
        {
            RoleArn = roleToAssumeArn,
            SessionName = "PulumiSession",
            ExternalId = "PulumiApplication"
        }
    });

    var emptyBucketArgs = new BucketArgs();
    
    var bucket = new Bucket(
        name: "myBucket",  
        args: emptyBucketArgs, 
        options: new CustomResourceOptions { Provider = provider }
    );

    return new Dictionary<string, object?>
    {
        ["bucketName"] = bucket.BucketName
    };
});