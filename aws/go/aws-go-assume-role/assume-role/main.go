// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		region := config.Require(ctx, "aws:region")
		config := config.New(ctx, "")
		roleToAssumeARN := config.Require("roleToAssumeARN")

		provider, err := aws.NewProvider(ctx, "privileged", &aws.ProviderArgs{
			AssumeRole: &aws.ProviderAssumeRoleArgs{
				RoleArn:     pulumi.StringPtr(roleToAssumeARN),
				SessionName: pulumi.String("PulumiSession"),
				ExternalId:  pulumi.String("PulumiApplication"),
			},
			Region: pulumi.String(region),
		})

		if err != nil {
			return err
		}

		// Create an AWS resource (S3 Bucket)
		bucket, err := s3.NewBucket(ctx, "my-bucket", nil, pulumi.Provider(provider))
		if err != nil {
			return err
		}

		// Export the name of the bucket
		ctx.Export("bucketName", bucket.BucketDomainName)
		return nil
	})
}
