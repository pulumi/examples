// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	"fmt"
	"strings"

	cdn "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/cdn/latest"
	resources "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/resources/latest"
	storage "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/storage/latest"
	"github.com/pulumi/pulumi-random/sdk/v3/go/random"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// TODO: Remove after autonaming support is added.
		randomSuffix, err := random.NewRandomString(ctx, "randomSuffix", &random.RandomStringArgs{
			Length:  pulumi.Int(10),
			Special: pulumi.Bool(false),
			Upper:   pulumi.Bool(false),
		})
		if err != nil {
			return err
		}

		cfg := config.New(ctx, "")
		storageAccountName := randomSuffix.Result.ApplyString(func(s string) string {
			return fmt.Sprintf("%v%v", "site", s)
		})
		if param := cfg.Get("storageAccountName"); param != "" {
			storageAccountName = pulumi.String(param).ToStringOutput()
		}
		cdnEndpointName := storageAccountName.ApplyString(func(s string) string {
			return fmt.Sprintf("%v%v", "cdn-endpnt-", s)
		})
		if param := cfg.Get("cdnEndpointName"); param != "" {
			cdnEndpointName = pulumi.String(param).ToStringOutput()
		}
		cdnProfileName := storageAccountName.ApplyString(func(s string) string {
			return fmt.Sprintf("%v%v", "cdn-profile-", s)
		})
		if param := cfg.Get("cdnProfileName"); param != "" {
			cdnProfileName = pulumi.String(param).ToStringOutput()
		}

		resourceGroup, err := resources.NewResourceGroup(ctx, "resourceGroup", &resources.ResourceGroupArgs{
			ResourceGroupName: randomSuffix.Result.ApplyString(func(result string) string {
				return fmt.Sprintf("%v%v", "rg", result)
			}),
		})
		if err != nil {
			return err
		}

		profile, err := cdn.NewProfile(ctx, "profile", &cdn.ProfileArgs{
			ProfileName:       cdnProfileName,
			ResourceGroupName: resourceGroup.Name,
			Sku: &cdn.SkuArgs{
				Name: cdn.SkuName_Standard_Microsoft,
			},
		})
		if err != nil {
			return err
		}

		accessTierHot := storage.AccessTierHot
		storageAccount, err := storage.NewStorageAccount(ctx, "storageAccount", &storage.StorageAccountArgs{
			AccessTier:             &accessTierHot,
			AccountName:            storageAccountName,
			EnableHttpsTrafficOnly: pulumi.Bool(true),
			Encryption: &storage.EncryptionArgs{
				KeySource: storage.KeySource_Microsoft_Storage,
				Services: &storage.EncryptionServicesArgs{
					Blob: &storage.EncryptionServiceArgs{
						Enabled: pulumi.Bool(true),
					},
					File: &storage.EncryptionServiceArgs{
						Enabled: pulumi.Bool(true),
					},
				},
			},
			Kind: storage.KindStorageV2,
			NetworkRuleSet: &storage.NetworkRuleSetArgs{
				Bypass:        storage.BypassAzureServices,
				DefaultAction: storage.DefaultActionAllow,
			},
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
			EndpointName:           cdnEndpointName,
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
		blobTypeBlock := storage.BlobTypeBlock
		_, err = storage.NewBlob(ctx, "index_html", &storage.BlobArgs{
			BlobName:          pulumi.String("index.html"),
			ResourceGroupName: resourceGroup.Name,
			AccountName:       storageAccount.Name,
			ContainerName:     staticWebsite.ContainerName,
			Type:              &blobTypeBlock,
			Source:            pulumi.NewFileAsset("./wwwroot/index.html"),
			ContentType:       pulumi.String("text/html"),
		})
		if err != nil {
			return err
		}
		_, err = storage.NewBlob(ctx, "notfound_html", &storage.BlobArgs{
			BlobName:          pulumi.String("404.html"),
			ResourceGroupName: resourceGroup.Name,
			AccountName:       storageAccount.Name,
			ContainerName:     staticWebsite.ContainerName,
			Type:              &blobTypeBlock,
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
