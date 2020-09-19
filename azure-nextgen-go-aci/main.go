// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
package main

import (
	containerinstance "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/containerinstance/latest"
	resources "github.com/pulumi/pulumi-azure-nextgen/sdk/go/azure/resources/latest"
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
			ResourceGroupName: pulumi.String("aci-rg"),
			Location:          pulumi.String(location),
		})
		if err != nil {
			return err
		}

		imageName := "mcr.microsoft.com/azuredocs/aci-helloworld"
		containerGroup, err := containerinstance.NewContainerGroup(ctx, "containerGroup", &containerinstance.ContainerGroupArgs{
			ResourceGroupName: resourceGroup.Name,
			Location: resourceGroup.Location,
			ContainerGroupName: pulumi.String("helloworld"),
			OsType: pulumi.String("Linux"),
			Containers: &containerinstance.ContainerArray{
				&containerinstance.ContainerArgs{
					Name:  pulumi.String("acilinuxpublicipcontainergroup"),
					Image: pulumi.String(imageName),
					Ports: &containerinstance.ContainerPortArray{
						&containerinstance.ContainerPortArgs{Port: pulumi.Int(80)},
					},
					Resources: &containerinstance.ResourceRequirementsArgs{
						Requests: &containerinstance.ResourceRequestsArgs{
							Cpu: pulumi.Float64(1.0),
							MemoryInGB: pulumi.Float64(1.5),
						},
					},
				},
			},
			IpAddress: &containerinstance.IpAddressArgs{
				Ports: &containerinstance.PortArray{
					&containerinstance.PortArgs{
						Port: pulumi.Int(80),
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

		ctx.Export("containerIPv4Address", containerGroup.IpAddress.ApplyT(func(ip *containerinstance.IpAddressResponse) (string, error) {
			if ip == nil || ip.Ip == nil {
				return "", nil
			}
			return *ip.Ip, nil
		}).(pulumi.StringOutput))

		return nil
	})
}
