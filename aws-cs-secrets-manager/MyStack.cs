// Copyright 2016-2021, Pulumi Corporation.

using Pulumi;
using Pulumi.Aws.SecretsManager;

class MyStack : Stack
{
    public MyStack()
    {
        // Create secret
        var secret = new Secret("secret");

        // Create secret version
        var secretVersion = new SecretVersion("secretVersion", new SecretVersionArgs
        {
            SecretId = secret.Id,
            SecretString = "mysecret"
        });

        this.SecretId = secret.Id;
    }

    [Output]
    public Output<string> SecretId { get; set; }
}
