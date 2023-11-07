// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	"encoding/json"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {

	pulumi.Run(func(ctx *pulumi.Context) error {
		config := config.New(ctx, "")
		unprivilegedUsername := config.Require("unprivilegedUsername")
		unprivilegedUser, err := iam.NewUser(ctx, "unprivilegedUser", &iam.UserArgs{
			Name: pulumi.String(unprivilegedUsername),
		})

		// additional_secret_outputs specify properties that must be encrypted as secrets
		// https://www.pulumi.com/docs/intro/concepts/resources/#additionalsecretoutputs
		secretString := []string{"secret"}
		unprivilegedUserCreds, err := iam.NewAccessKey(ctx, "unprivileged-user-key", &iam.AccessKeyArgs{
			User: unprivilegedUser.Name,
		}, pulumi.AdditionalSecretOutputs(secretString))

		if err != nil {
			return err
		}

		tempPolicy := unprivilegedUser.Arn.ApplyT(func(arn string) (string, error) {
			tempoJSON, err := json.Marshal(map[string]interface{}{
				"Version": "2012-10-17",
				"Statement": []interface{}{
					map[string]interface{}{
						"Sid":       "AllowAssumeRole",
						"Effect":    "Allow",
						"Principal": map[string]interface{}{"AWS": arn},
						"Action":    []string{"sts:AssumeRole"},
					},
				},
			})
			if err != nil {
				return "", err
			}
			return string(tempoJSON), nil
		})

		allowS3ManagementRole, err := iam.NewRole(ctx, "allow-s3-management", &iam.RoleArgs{
			Description:      pulumi.String("Allow management of S3 buckets"),
			AssumeRolePolicy: tempPolicy,
		})

		if err != nil {
			return err
		}

		_, err = iam.NewRolePolicy(ctx, "allow-s3-management-policy", &iam.RolePolicyArgs{
			Role: allowS3ManagementRole.Name,
			Policy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Sid": "AllowS3Management",
					"Effect": "Allow",
					"Resource": "*",
					"Action": "s3:*"
				}]
			}`),
		}, pulumi.Parent(allowS3ManagementRole))

		if err != nil {
			return err
		}

		ctx.Export("roleArn", allowS3ManagementRole.Arn)
		ctx.Export("accessKeyId", unprivilegedUserCreds.ID().ToStringOutput())
		ctx.Export("secretAccessKey", unprivilegedUserCreds.Secret)
		return nil
	})
}
