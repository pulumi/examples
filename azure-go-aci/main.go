package main

import (
	"github.com/pulumi/pulumi-azure/sdk/go/azure/containerservice"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/core"
	"github.com/pulumi/pulumi-docker/sdk/go/docker"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a resource group.
		resourceGroup, err := core.NewResourceGroup(ctx, "aci-rg", nil)
		if err != nil {
			return err
		}

		// Create a registry.
		registryArgs := containerservice.RegistryArgs{
			ResourceGroupName: resourceGroup.Name,
			AdminEnabled:      pulumi.Bool(true),
			Sku:               pulumi.String("Premium"),
		}
		registry, err := containerservice.NewRegistry(ctx, "registry", &registryArgs)
		if err != nil {
			return err
		}

		// Create the docker image.
		imageArgs := docker.ImageArgs{
			ImageName: pulumi.Sprintf("%s/mynodeapp:v1.0.0", registry.LoginServer),
			Build: &docker.DockerBuildArgs{
				Context: pulumi.String("./app"),
			},
			Registry: &docker.ImageRegistryArgs{
				Server:   registry.LoginServer,
				Username: registry.AdminUsername,
				Password: registry.AdminPassword,
			},
		}
		image, err := docker.NewImage(ctx, "node-app", &imageArgs)
		if err != nil {
			return err
		}

		// Create a group.
		credentialArgs := containerservice.GroupImageRegistryCredentialArgs{
			Server:   registry.LoginServer,
			Username: registry.AdminUsername,
			Password: registry.AdminPassword,
		}
		portArgs := containerservice.GroupContainerPortArgs{
			Port:     pulumi.Int(80),
			Protocol: pulumi.String("TCP"),
		}
		containerArgs := containerservice.GroupContainerArgs{
			Cpu:    pulumi.Float64(0.5),
			Image:  image.ImageName,
			Memory: pulumi.Float64(1.5),
			Name:   pulumi.String("hello-world"),
			Ports:  containerservice.GroupContainerPortArray{portArgs},
		}
		groupArgs := containerservice.GroupArgs{
			ResourceGroupName:        resourceGroup.Name,
			ImageRegistryCredentials: containerservice.GroupImageRegistryCredentialArray{credentialArgs},
			OsType:                   pulumi.String("Linux"),
			Containers:               containerservice.GroupContainerArray{containerArgs},
			IpAddressType:            pulumi.String("public"),
			DnsNameLabel:             pulumi.String("acigo"),
		}
		group, err := containerservice.NewGroup(ctx, "aci", &groupArgs)
		if err != nil {
			return err
		}

		ctx.Export("endpoint", group.Fqdn)
		return nil
	})
}
