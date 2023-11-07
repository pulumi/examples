// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
package main

import (
	"fmt"

	"github.com/pulumi/pulumi-azure-native-sdk/containerregistry/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/web/v2"
	"github.com/pulumi/pulumi-docker/sdk/v3/go/docker"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		resourceGroup, err := resources.NewResourceGroup(ctx, "appservice-docker-rg", nil)
		if err != nil {
			return err
		}

		plan, err := web.NewAppServicePlan(ctx, "plan", &web.AppServicePlanArgs{
			ResourceGroupName: resourceGroup.Name,
			Kind:              pulumi.String("Linux"),
			Reserved:          pulumi.Bool(true),
			Sku: &web.SkuDescriptionArgs{
				Name: pulumi.String("B1"),
				Tier: pulumi.String("Basic"),
			},
		})
		if err != nil {
			return err
		}

		//
		// Scenario 1: deploying an image from Docker Hub.
		// The example uses an nginx base image
		// Image: https://hub.docker.com/_/nginx
		//
		imageInDockerHub := "nginx"
		helloApp, err := web.NewWebApp(ctx, "helloApp", &web.WebAppArgs{
			ResourceGroupName: resourceGroup.Name,
			ServerFarmId:      plan.ID(),
			SiteConfig: &web.SiteConfigArgs{
				AppSettings: web.NameValuePairArray{
					&web.NameValuePairArgs{
						Name:  pulumi.String("WEBSITES_ENABLE_APP_SERVICE_STORAGE"),
						Value: pulumi.String("false"),
					},
				},
				AlwaysOn:       pulumi.Bool(true),
				LinuxFxVersion: pulumi.String(fmt.Sprintf("%v%v", "DOCKER|", imageInDockerHub)),
			},
			HttpsOnly: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		ctx.Export("helloEndpoint", helloApp.DefaultHostName.ApplyT(func(defaultHostName string) (string, error) {
			return fmt.Sprintf("%v%v", "https://", defaultHostName), nil
		}).(pulumi.StringOutput))

		//
		// Scenario 2: deploying a custom image from Azure Container Registry.
		//
		customImage := "node-app"
		registry, err := containerregistry.NewRegistry(ctx, "registry", &containerregistry.RegistryArgs{
			ResourceGroupName: resourceGroup.Name,
			Sku: &containerregistry.SkuArgs{
				Name: pulumi.String("Basic"),
			},
			AdminUserEnabled: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		credentials := containerregistry.ListRegistryCredentialsOutput(ctx, containerregistry.ListRegistryCredentialsOutputArgs{
			RegistryName:      registry.Name,
			ResourceGroupName: resourceGroup.Name,
		})

		adminUsername := credentials.Username().Elem()
		adminPassword := credentials.Passwords().Index(pulumi.Int(0)).Value().Elem()

		myImage, err := docker.NewImage(ctx, customImage, &docker.ImageArgs{
			ImageName: registry.LoginServer.ApplyT(func(result string) (string, error) {
				return fmt.Sprintf("%s/%s:v1.0.0", result, customImage), nil
			}).(pulumi.StringOutput),
			Build: &docker.DockerBuildArgs{Context: pulumi.String(fmt.Sprintf("./%s", customImage))},
			Registry: &docker.ImageRegistryArgs{
				Server:   registry.LoginServer,
				Username: adminUsername,
				Password: adminPassword,
			},
		})
		if err != nil {
			return err
		}

		getStartedApp, err := web.NewWebApp(ctx, "getStartedApp", &web.WebAppArgs{
			ResourceGroupName: resourceGroup.Name,
			ServerFarmId:      plan.ID(),
			SiteConfig: &web.SiteConfigArgs{
				AppSettings: web.NameValuePairArray{
					&web.NameValuePairArgs{
						Name:  pulumi.String("WEBSITES_ENABLE_APP_SERVICE_STORAGE"),
						Value: pulumi.String("false"),
					},
					&web.NameValuePairArgs{
						Name: pulumi.String("DOCKER_REGISTRY_SERVER_URL"),
						Value: registry.LoginServer.ApplyT(func(loginServer string) (string, error) {
							return fmt.Sprintf("%v%v", "https://", loginServer), nil
						}).(pulumi.StringOutput),
					},
					&web.NameValuePairArgs{
						Name:  pulumi.String("DOCKER_REGISTRY_SERVER_USERNAME"),
						Value: adminUsername,
					},
					&web.NameValuePairArgs{
						Name:  pulumi.String("DOCKER_REGISTRY_SERVER_PASSWORD"),
						Value: adminPassword,
					},
					&web.NameValuePairArgs{
						Name:  pulumi.String("WEBSITES_PORT"),
						Value: pulumi.String("80"),
					},
				},
				AlwaysOn: pulumi.Bool(true),
				LinuxFxVersion: myImage.ImageName.ApplyT(func(result string) (string, error) {
					return fmt.Sprintf("DOCKER|%s", result), nil
				}).(pulumi.StringOutput),
			},
			HttpsOnly: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		ctx.Export("getStartedEndpoint", getStartedApp.DefaultHostName.ApplyT(func(defaultHostName string) (string, error) {
			return fmt.Sprintf("%v%v", "https://", defaultHostName), nil
		}).(pulumi.StringOutput))

		return nil
	})
}
