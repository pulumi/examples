// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

package main

import (
	"fmt"
	"strings"

	"github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/cdn"
	"github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/resources"
	"github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/storage"
	"github.com/pulumi/pulumi-random/sdk/v3/go/random"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		resourceGroup, err := resources.NewResourceGroup(ctx, "website-rg")
		if err != nil {
			return err
		}

		profile, err := cdn.NewProfile(ctx, "profile", &cdn.ProfileArgs{
			ResourceGroupName: resourceGroup.Name,
			Sku: &cdn.SkuArgs{
				Name: cdn.SkuName_Standard_Microsoft,
			},
		})
		if err != nil {
			return err
		}

		storageAccount, err := storage.NewStorageAccount(ctx, "sa", &storage.StorageAccountArgs{
			ResourceGroupName: resourceGroup.Name,
			Sku: &storage.SkuArgs{
				Name: storage.SkuName_Standard_LRS,
			},
		})
		if err != nil {
			return err
		}

		endpointOrigin := storageAccount.PrimaryEndpoints.Web().ApplyString(func(endpoint string) string {
			endpoint = strings.ReplaceAll(endpoint, "https://", "")
			endpoint = strings.ReplaceAll(endpoint, "/", "")
			return endpoint
		})

		queryStringCachingBehaviorNotSet := cdn.QueryStringCachingBehaviorNotSet
		endpoint, err := cdn.NewEndpoint(ctx, "endpoint", &cdn.EndpointArgs{
			ContentTypesToCompress: pulumi.StringArray{},
			IsCompressionEnabled:   pulumi.Bool(false),
			IsHttpAllowed:          pulumi.Bool(false),
			IsHttpsAllowed:         pulumi.Bool(true),
			OriginHostHeader:       endpointOrigin,
			Origins: cdn.DeepCreatedOriginArray{
				&cdn.DeepCreatedOriginArgs{
					HostName:  endpointOrigin,
					HttpsPort: pulumi.Int(443),
					Name: pulumi.All(randomSuffix.Result, cdnEndpointName).ApplyString(
						func(args []interface{}) string {
							return fmt.Sprintf("%v%v%v", args[1], "-origin-", args[0])
						}),
				},
			},
			ProfileName:                profile.Name,
			QueryStringCachingBehavior: &queryStringCachingBehaviorNotSet,
			ResourceGroupName:          resourceGroup.Name,
		})
		if err != nil {
			return err
		}

		// Enable static website support
		staticWebsite, err := storage.NewStorageAccountStaticWebsite(ctx, "staticWebsite", &storage.StorageAccountStaticWebsiteArgs{
			AccountName:       storageAccount.Name,
			ResourceGroupName: resourceGroup.Name,
			IndexDocument:     pulumi.String("index.html"),
			Error404Document:  pulumi.String("404.html"),
		})
		if err != nil {
			return err
		}

		// Upload the files
		_, err = storage.NewBlob(ctx, "index.html", &storage.BlobArgs{
			ResourceGroupName: resourceGroup.Name,
			AccountName:       storageAccount.Name,
			ContainerName:     staticWebsite.ContainerName,
			Source:            pulumi.NewFileAsset("./wwwroot/index.html"),
			ContentType:       pulumi.String("text/html"),
		})
		if err != nil {
			return err
		}
		_, err = storage.NewBlob(ctx, "404.html", &storage.BlobArgs{
			ResourceGroupName: resourceGroup.Name,
			AccountName:       storageAccount.Name,
			ContainerName:     staticWebsite.ContainerName,
			Source:            pulumi.NewFileAsset("./wwwroot/404.html"),
			ContentType:       pulumi.String("text/html"),
		})
		if err != nil {
			return err
		}

		// Web endpoint to the website
		ctx.Export("staticEndpoint", storageAccount.PrimaryEndpoints.Web())

		// CDN endpoint to the website.
		// Allow it some time after the deployment to get ready.
		ctx.Export("cdnEndpoint", endpoint.HostName.ApplyString(func(hostName string) string {
			return fmt.Sprintf("%v%v", "https://", hostName)
		}))

		return nil
	})
}
