// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
package main

import (
	"github.com/pulumi/pulumi-azure-native-sdk/containerinstance/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		resourceGroup, err := resources.NewResourceGroup(ctx, "aci-rg", nil)
		if err != nil {
			return err
		}

		imageName := "mcr.microsoft.com/azuredocs/aci-helloworld"
		containerGroup, err := containerinstance.NewContainerGroup(ctx, "helloworld", &containerinstance.ContainerGroupArgs{
			ResourceGroupName: resourceGroup.Name,
			OsType:            pulumi.String("Linux"),
			Containers: &containerinstance.ContainerArray{
				&containerinstance.ContainerArgs{
					Name:  pulumi.String("acilinuxpublicipcontainergroup"),
					Image: pulumi.String(imageName),
					Ports: &containerinstance.ContainerPortArray{
						&containerinstance.ContainerPortArgs{Port: pulumi.Int(80)},
					},
					Resources: &containerinstance.ResourceRequirementsArgs{
						Requests: &containerinstance.ResourceRequestsArgs{
							Cpu:        pulumi.Float64(1.0),
							MemoryInGB: pulumi.Float64(1.5),
						},
					},
				},
			},
			IpAddress: &containerinstance.IpAddressArgs{
				Ports: &containerinstance.PortArray{
					&containerinstance.PortArgs{
						Port:     pulumi.Int(80),
						Protocol: pulumi.String("Tcp"),
					},
				},
				Type: pulumi.String("Public"),
			},
			RestartPolicy: pulumi.String("always"),
		})
		if err != nil {
			return err
		}

		ctx.Export("containerIPv4Address", containerGroup.IpAddress.Ip())

		return nil
	})
}
