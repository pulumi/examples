// Copyright 2016-2022, Pulumi Corporation.
using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws.SecretsManager;

await Deployment.RunAsync(() =>
{
    // Create secret
    var secret = new Secret("secret");

    // Create secret version
    var secretVersion = new SecretVersion("secretVersion", new SecretVersionArgs
    {
        SecretId = secret.Id,
        SecretString = "my-secret"
    });

    return new Dictionary<string, object?>
    {
        ["secretId"] = secret.Id
    };
});