// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	crontabsv1 "kubernetes-go-crontabs/crontabs/v1"

	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/yaml"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Register the CronTab CRD.
		_, err := yaml.NewConfigFile(ctx, "my-crontab-definition",
			&yaml.ConfigFileArgs{
				File: "../crontab.yaml",
			},
		)
		if err != nil {
			return err
		}

		// Here's the old way using the untyped CustomResource API:
		//
		// cronTabInstance, err := apiextensions.NewCustomResource(ctx,
		// 	"my-new-cron-object",
		//	&apiextensions.CustomResourceArgs{
		//		ApiVersion: pulumi.String("stable.example.com/v1"),
		//		Kind:       pulumi.String("CronTab"),
		//		Metadata: metav1.ObjectMetaArgs{
		//			Name: pulumi.StringPtr("my-new-cron-object"),
		//		},
		//		OtherFields: map[string]interface{}{
		//			"spec": map[string]interface{}{
		//				"cronSpec": "* * * * */5",
		//				"image":    "my-awesome-cron-image",
		//			},
		//		},
		//	},
		// )

		cronTabInstance, err := crontabsv1.NewCronTab(ctx, "my-new-cron-object",
			&crontabsv1.CronTabArgs{
				Metadata: metav1.ObjectMetaArgs{
					Name: pulumi.StringPtr("my-new-cron-object"),
				},
				Spec: crontabsv1.CronTabSpecArgs{
					CronSpec: pulumi.StringPtr("* * * * *5"),
					Image:    pulumi.StringPtr("my-awesome-cron-image"),
				},
			},
		)
		if err != nil {
			return err
		}

		ctx.Export("urn", cronTabInstance.URN())
		return nil
	})
}
