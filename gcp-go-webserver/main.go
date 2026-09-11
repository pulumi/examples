package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v9/go/gcp/compute"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		computeNetwork, err := compute.NewNetwork(ctx, "network",
			&compute.NetworkArgs{
				AutoCreateSubnetworks: pulumi.Bool(true),
			},
		)
		if err != nil {
			return err
		}

		// Allow SSH and HTTP from anywhere, but only to instances tagged "web".
		// SourceRanges selects who may connect; TargetTags scopes the rule to the
		// instances it protects. SourceTags cannot be used here: it selects source
		// instances by network tag inside the VPC, so it never matches traffic
		// arriving at an instance's external IP.
		computeFirewall, err := compute.NewFirewall(ctx, "firewall",
			&compute.FirewallArgs{
				Network: computeNetwork.SelfLink,
				SourceRanges: pulumi.StringArray{
					pulumi.String("0.0.0.0/0"),
				},
				TargetTags: pulumi.StringArray{
					pulumi.String("web"),
				},
				Allows: &compute.FirewallAllowArray{
					&compute.FirewallAllowArgs{
						Protocol: pulumi.String("tcp"),
						Ports: pulumi.StringArray{
							pulumi.String("22"),
							pulumi.String("80"),
						},
					},
				},
			},
		)
		if err != nil {
			return err
		}

		// (optional) create a simple web server using the startup script for the instance
		startupScript := `#!/bin/bash
		echo "Hello, World!" > index.html
		nohup python -m SimpleHTTPServer 80 &`

		computeInstance, err := compute.NewInstance(ctx, "instance",
			&compute.InstanceArgs{
				MachineType:           pulumi.String("f1-micro"),
				MetadataStartupScript: pulumi.String(startupScript),
				// Matches the firewall rule's TargetTags.
				Tags: pulumi.StringArray{
					pulumi.String("web"),
				},
				BootDisk: &compute.InstanceBootDiskArgs{
					InitializeParams: &compute.InstanceBootDiskInitializeParamsArgs{
						Image: pulumi.String("debian-cloud/debian-9-stretch-v20181210"),
					},
				},
				NetworkInterfaces: compute.InstanceNetworkInterfaceArray{
					&compute.InstanceNetworkInterfaceArgs{
						Network: computeNetwork.ID(),
						// Must be empty to request an ephemeral IP
						AccessConfigs: &compute.InstanceNetworkInterfaceAccessConfigArray{
							&compute.InstanceNetworkInterfaceAccessConfigArgs{},
						},
					},
				},
				ServiceAccount: &compute.InstanceServiceAccountArgs{
					Scopes: pulumi.StringArray{
						pulumi.String("https://www.googleapis.com/auth/cloud-platform"),
					},
				},
			},
			pulumi.DependsOn([]pulumi.Resource{computeFirewall}),
		)
		if err != nil {
			return err
		}

		ctx.Export("instanceName", computeInstance.Name)
		ctx.Export("instanceIP", computeInstance.NetworkInterfaces.Index(pulumi.Int(0)).AccessConfigs().Index(pulumi.Int(0)).NatIp())
		return nil
	})
}
