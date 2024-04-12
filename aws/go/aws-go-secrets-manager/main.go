// Copyright 2016-2021, Pulumi Corporation.

package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/secretsmanager"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		secret, err := secretsmanager.NewSecret(ctx, "secretcontainer", nil)
		if err != nil {
			return err
		}

		_, err = secretsmanager.NewSecretVersion(ctx, "secret", &secretsmanager.SecretVersionArgs{
			SecretId:     secret.ID(),
			SecretString: pulumi.String("mysecret"),
		})
		if err != nil {
			return err
		}

		// Export the ID (in this case the ARN) of the secret
		ctx.Export("secretContainer", secret.ID())
		return nil
	})
}
