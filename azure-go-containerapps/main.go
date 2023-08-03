// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
package main

import (
	"github.com/pulumi/pulumi-azure-native-sdk/app/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/containerregistry/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/operationalinsights/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi-docker/sdk/v3/go/docker"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		resourceGroup, err := resources.NewResourceGroup(ctx, "rg", nil)
		if err != nil {
			return err
		}

		workspace, err := operationalinsights.NewWorkspace(ctx, "workspace", &operationalinsights.WorkspaceArgs{
			ResourceGroupName: resourceGroup.Name,
			RetentionInDays:   pulumi.Int(30),
			Sku: operationalinsights.WorkspaceSkuArgs{
				Name: pulumi.String("PerGB2018"),
			},
		})
		if err != nil {
			return err
		}

		sharedKey := pulumi.All(resourceGroup.Name, workspace.Name).ApplyT(
			func(args []interface{}) (string, error) {
				resourceGroupName := args[0].(string)
				workspaceName := args[1].(string)
				accountKeys, err := operationalinsights.GetSharedKeys(ctx, &operationalinsights.GetSharedKeysArgs{
					ResourceGroupName: resourceGroupName,
					WorkspaceName:     workspaceName,
				})
				if err != nil {
					return "", err
				}

				return *accountKeys.PrimarySharedKey, nil
			},
		).(pulumi.StringOutput)

		managedEnvironment, err := app.NewManagedEnvironment(ctx, "managedEnvironment", &app.ManagedEnvironmentArgs{
			ResourceGroupName: resourceGroup.Name,
			AppLogsConfiguration: app.AppLogsConfigurationArgs{
				Destination: pulumi.String("log-analytics"),
				LogAnalyticsConfiguration: app.LogAnalyticsConfigurationArgs{
					CustomerId: workspace.CustomerId,
					SharedKey:  sharedKey,
				},
			},
		})
		if err != nil {
			return err
		}

		registry, err := containerregistry.NewRegistry(ctx, "registry", &containerregistry.RegistryArgs{
			ResourceGroupName: resourceGroup.Name,
			Sku: containerregistry.SkuArgs{
				Name: pulumi.String("Basic"),
			},
			AdminUserEnabled: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}
		credentials := pulumi.All(resourceGroup.Name, registry.Name).ApplyT(
			func(args []interface{}) (*containerregistry.ListRegistryCredentialsResult, error) {
				resourceGroupName := args[0].(string)
				registryName := args[1].(string)
				return containerregistry.ListRegistryCredentials(ctx, &containerregistry.ListRegistryCredentialsArgs{
					ResourceGroupName: resourceGroupName,
					RegistryName:      registryName,
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

		newImage, err := docker.NewImage(ctx, "node-app", &docker.ImageArgs{
			ImageName: pulumi.Sprintf("%s/node-app:v1.0.0", registry.LoginServer),
			Build: docker.DockerBuildArgs{
				Context: pulumi.String("./node-app"),
			},
			Registry: docker.ImageRegistryArgs{
				Server:   registry.LoginServer,
				Username: adminUsername,
				Password: adminPassword,
			},
		})
		if err != nil {
			return err
		}

		containerApp, err := app.NewContainerApp(ctx, "app", &app.ContainerAppArgs{
			ResourceGroupName:    resourceGroup.Name,
			ManagedEnvironmentId: managedEnvironment.ID(),
			Configuration: app.ConfigurationArgs{
				Ingress: app.IngressArgs{
					External:   pulumi.Bool(true),
					TargetPort: pulumi.IntPtr(80),
				},
				Registries: app.RegistryCredentialsArray{
					app.RegistryCredentialsArgs{
						Server:            registry.LoginServer,
						Username:          adminUsername,
						PasswordSecretRef: pulumi.String("pwd")},
				},
				Secrets: app.SecretArray{
					app.SecretArgs{
						Name:  pulumi.String("pwd"),
						Value: adminPassword,
					},
				},
			},
			Template: app.TemplateArgs{
				Containers: app.ContainerArray{
					app.ContainerArgs{
						Name:  pulumi.String("myapp"),
						Image: newImage.ImageName,
					},
				},
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("url", pulumi.Sprintf("https://%s", containerApp.LatestRevisionFqdn))

		return nil
	})
}
