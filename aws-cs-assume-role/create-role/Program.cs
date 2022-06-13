// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.s
using System.Collections.Generic;
using Pulumi;
using Iam = Pulumi.Aws.Iam;
using System.Text.Json.Nodes;

await Deployment.RunAsync(() =>
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

    var assumeRolePolicy = unprivilegedUser.Arn.Apply(arn =>
    {
        var policyArgs = new JsonObject
        {
            ["Version"] = "2012-10-17",
            ["Statement"] = new JsonObject
            {
                ["Sid"] = "AllowAssumeRole",
                ["Effect"] = "Allow",
                ["Action"] = "sts:AssumeRole",
                ["Principal"] = new JsonObject
                {
                    ["AWS"] = arn
                }
            }
        };

        return policyArgs.ToJsonString();
    });

    var allowS3ManagementRole = new Iam.Role("allow-s3-management", new Iam.RoleArgs
    {
        Description = "Allow management of S3 buckets",
        AssumeRolePolicy = assumeRolePolicy
    });

    var rolePolicyJson = new JsonObject
    {
        ["Version"] = "2012-10-17",
        ["Statement"] = new JsonArray
        {
            new JsonObject
            {
                ["Effect"] = "Allow",
                ["Action"] = "s3:*",
                ["Resource"] = "*",
                ["Sid"] = "allowS3Access"
            }
        }
    };
    
    
    var rolePolicy = new Iam.RolePolicy("allow-s3-management-policy", new Iam.RolePolicyArgs
        {
            Role = allowS3ManagementRole.Name,
            Policy = rolePolicyJson.ToJsonString()
        },
        new CustomResourceOptions { Parent = allowS3ManagementRole }
    );

    return new Dictionary<string, object?>
    {
        ["roleArn"] = allowS3ManagementRole.Arn,
        ["accessKeyId"] = unprivilegedUserCreds.Id,
        ["secretAccessKey"] = unprivilegedUserCreds.Secret
    };
});