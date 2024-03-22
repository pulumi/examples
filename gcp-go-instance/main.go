package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v7/go/gcp/compute"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		inst, err := compute.NewInstance(ctx, "instance", &compute.InstanceArgs{
			BootDisk: &compute.InstanceBootDiskArgs{
				InitializeParams: &compute.InstanceBootDiskInitializeParamsArgs{
					Image: pulumi.String("debian-cloud/debian-9"),
				},
			},
			MachineType: pulumi.String("n1-standard-1"),
			NetworkInterfaces: &compute.InstanceNetworkInterfaceArray{
				&compute.InstanceNetworkInterfaceArgs{
					Network: pulumi.String("default"),
				},
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("instanceName", inst.Name)
		return nil
	})
}
