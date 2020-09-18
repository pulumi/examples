// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
package main

import (
	"fmt"

	containerregistry "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/containerregistry/latest"
	resources "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/resources/latest"
	web "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/web/latest"
	"github.com/pulumi/pulumi-docker/sdk/v2/go/docker"
	"github.com/pulumi/pulumi-random/sdk/v2/go/random"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		c := config.New(ctx, "")
		location := c.Get("location")
		if location == "" {
			location = "WestUS"
		}
		
		resourceGroup, err := resources.NewResourceGroup(ctx, "resourceGroup", &resources.ResourceGroupArgs{
			ResourceGroupName: pulumi.String("appservice-docker-rg"),
			Location:          pulumi.String(location),
		})
		if err != nil {
			return err
		}

		plan, err := web.NewAppServicePlan(ctx, "plan", &web.AppServicePlanArgs{
			ResourceGroupName: resourceGroup.Name,
			Name:              pulumi.String("linux-asp"),
			Location:          resourceGroup.Location,
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

		suffix, err := random.NewRandomString(ctx, "suffix", &random.RandomStringArgs{
			Length:  pulumi.Int(6),
			Special: pulumi.Bool(false),
			Upper:   pulumi.Bool(false),
		})
		if err != nil {
			return err
		}

		//
		// Scenario 1: deploying an image from Docker Hub.
		// The example uses a HelloWorld application written in Go.
		// Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
		//
		imageInDockerHub := "microsoft/azure-appservices-go-quickstart"
		helloApp, err := web.NewWebApp(ctx, "helloApp", &web.WebAppArgs{
			ResourceGroupName: resourceGroup.Name,
			Location:          plan.Location,
			Name: suffix.Result.ApplyT(func(result string) (string, error) {
				return fmt.Sprintf("%v%v", "hello-app-", result), nil
			}).(pulumi.StringOutput),
			ServerFarmId: plan.ID(),
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
			return fmt.Sprintf("%v%v%v", "https://", defaultHostName, "/hello"), nil
		}).(pulumi.StringOutput))

		//
		// Scenario 2: deploying a custom image from Azure Container Registry.
		//
		customImage := "node-app"
		registry, err := containerregistry.NewRegistry(ctx, "registry", &containerregistry.RegistryArgs{
			ResourceGroupName: resourceGroup.Name,
			RegistryName: suffix.Result.ApplyT(func(result string) (string, error) {
				return fmt.Sprintf("%v%v", "registry", result), nil
			}).(pulumi.StringOutput),
			Location: resourceGroup.Location,
			Sku: &containerregistry.SkuArgs{
				Name: pulumi.String("Basic"),
			},
			AdminUserEnabled: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		credentials := pulumi.All(resourceGroup.Name, registry.Name).ApplyT(
			func (args []interface{}) (*containerregistry.ListRegistryCredentialsResult, error) {
				resourceGroupName := args[0].(string)
				registryName := args[1].(string)
				return containerregistry.ListRegistryCredentials(ctx, &containerregistry.ListRegistryCredentialsArgs{
					ResourceGroupName: resourceGroupName,
					RegistryName: registryName,
				})
			},
		)

		adminUsername := credentials.ApplyT(func(result interface{}) (string, error) {
			credentials := result.(*containerregistry.ListRegistryCredentialsResult)
			return *credentials.Username, nil
		}).(pulumi.StringOutput)
		adminPassword := credentials.ApplyT(func(result interface{}) (string, error) {
			credentials := result.(*containerregistry.ListRegistryCredentialsResult)
			return *credentials.Passwords[0].Value, nil
		}).(pulumi.StringOutput)

		myImage, err := docker.NewImage(ctx, customImage, &docker.ImageArgs{
			ImageName: registry.LoginServer.ApplyT(func(result string) (string, error) {
				return fmt.Sprintf("%s/%s:v1.0.0", result, customImage), nil
			}).(pulumi.StringOutput),
			Build: &docker.DockerBuildArgs { Context: pulumi.String(fmt.Sprintf("./%s", customImage)) },
			Registry: &docker.ImageRegistryArgs{
				Server: registry.LoginServer,
				Username: adminUsername,
				Password: adminPassword,
			},
		})
		if err != nil {
			return err
		}

		getStartedApp, err := web.NewWebApp(ctx, "getStartedApp", &web.WebAppArgs{
			ResourceGroupName: resourceGroup.Name,
			Location:          plan.Location,
			Name: suffix.Result.ApplyT(func(result string) (string, error) {
				return fmt.Sprintf("%v%v", "get-started-", result), nil
			}).(pulumi.StringOutput),
			ServerFarmId: plan.ID(),
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
				AlwaysOn:       pulumi.Bool(true),
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
