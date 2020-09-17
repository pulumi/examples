package main

import (
	"fmt"

	containerregistry "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure-nextgen/containerregistry/latest"
	resources "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure-nextgen/resources/latest"
	web "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure-nextgen/web/latest"
	"github.com/pulumi/pulumi-random/sdk/v2/go/random"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		resourceGroup, err := resources.NewResourceGroup(ctx, "resourceGroup", &resources.ResourceGroupArgs{
			ResourceGroupName: pulumi.String("appservice-docker-rg"),
			Location:          pulumi.String("WestUS"),
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
		_ := "node-app"
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
						Value: pulumi.String(adminUsername),
					},
					&web.NameValuePairArgs{
						Name:  pulumi.String("DOCKER_REGISTRY_SERVER_PASSWORD"),
						Value: pulumi.String(adminPassword),
					},
					&web.NameValuePairArgs{
						Name:  pulumi.String("WEBSITES_PORT"),
						Value: pulumi.String("80"),
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
		ctx.Export("getStartedEndpoint", getStartedApp.DefaultHostName.ApplyT(func(defaultHostName string) (string, error) {
			return fmt.Sprintf("%v%v", "https://", defaultHostName), nil
		}).(pulumi.StringOutput))
		return nil
	})
}
