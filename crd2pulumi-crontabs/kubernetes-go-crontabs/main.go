// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	crontabs "kubernetes-go-crontabs/crontabs/v1"

	v1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/apiextensions/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		_, err := v1.NewCustomResourceDefinition(ctx, "cronTabDef",
			&v1.CustomResourceDefinitionArgs{
				Metadata: metav1.ObjectMetaArgs{
					Name: pulumi.StringPtr("crontabs.stable.example.com"),
				},
				Spec: v1.CustomResourceDefinitionSpecArgs{
					Group: pulumi.String("stable.example.com"),
					Versions: v1.CustomResourceDefinitionVersionArray{
						v1.CustomResourceDefinitionVersionArgs{
							Name:    pulumi.String("v1"),
							Served:  pulumi.Bool(true),
							Storage: pulumi.Bool(true),
							Schema: &v1.CustomResourceValidationArgs{
								OpenAPIV3Schema: &v1.JSONSchemaPropsArgs{
									Type: pulumi.StringPtr("object"),
									Properties: v1.JSONSchemaPropsMap{
										"spec": v1.JSONSchemaPropsArgs{
											Type: pulumi.StringPtr("object"),
											Properties: v1.JSONSchemaPropsMap{
												"cronSpec": v1.JSONSchemaPropsArgs{
													Type: pulumi.StringPtr("string"),
												},
												"image": v1.JSONSchemaPropsArgs{
													Type: pulumi.StringPtr("string"),
												},
												"replicas": v1.JSONSchemaPropsArgs{
													Type: pulumi.StringPtr("integer"),
												},
											},
										},
									},
								},
							},
						},
					},
					Scope: pulumi.String("Namespaced"),
					Names: v1.CustomResourceDefinitionNamesArgs{
						Plural:     pulumi.String("crontabs"),
						Singular:   pulumi.StringPtr("crontab"),
						Kind:       pulumi.String("CronTab"),
						ShortNames: pulumi.StringArray{pulumi.String("ct")},
					},
				},
			},
		)
		if err != nil {
			return err
		}

		// This is the what we would've wrote without crd2pulumi.
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

		cronTabInstance, err := crontabs.NewCronTab(ctx, "my-new-cron-object",
			&crontabs.CronTabArgs{
				Metadata: metav1.ObjectMetaArgs{
					Name: pulumi.StringPtr("my-new-cron-object"),
				},
				Spec: crontabs.CronTabSpecArgs{
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
