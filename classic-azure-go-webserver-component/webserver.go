// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

package main

import (
	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/compute"
	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/network"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Webserver is a reusable web server component that creates and exports a NIC, public IP, and VM.
type Webserver struct {
	pulumi.ResourceState

	PublicIP         *network.PublicIp
	NetworkInterface *network.NetworkInterface
	VM               *compute.VirtualMachine
}

type WebserverArgs struct {
	// A required username for the VM login.
	Username pulumi.StringInput

	// A required encrypted password for the VM password.
	Password pulumi.StringInput

	// An optional boot script that the VM will use.
	BootScript pulumi.StringInput

	// An optional VM size; if unspecified, Standard_A0 (micro) will be used.
	VMSize pulumi.StringInput

	// A required Resource Group in which to create the VM
	ResourceGroupName pulumi.StringInput

	// A required Subnet in which to deploy the VM
	SubnetID pulumi.StringInput
}

// NewWebserver allocates a new web server VM, NIC, and public IP address.
func NewWebserver(ctx *pulumi.Context, name string, args *WebserverArgs, opts ...pulumi.ResourceOption) (*Webserver, error) {
	webserver := &Webserver{}
	err := ctx.RegisterComponentResource("ws-ts-azure-comp:webserver:WebServer", name, webserver, opts...)
	if err != nil {
		return nil, err
	}

	webserver.PublicIP, err = network.NewPublicIp(ctx, name+"-ip", &network.PublicIpArgs{
		ResourceGroupName: args.ResourceGroupName,
		AllocationMethod:  pulumi.String("Dynamic"),
	}, pulumi.Parent(webserver))
	if err != nil {
		return nil, err
	}

	webserver.NetworkInterface, err = network.NewNetworkInterface(ctx, name+"-nic", &network.NetworkInterfaceArgs{
		ResourceGroupName: args.ResourceGroupName,
		IpConfigurations: network.NetworkInterfaceIpConfigurationArray{
			network.NetworkInterfaceIpConfigurationArgs{
				Name:                       pulumi.String("webserveripcfg"),
				SubnetId:                   args.SubnetID.ToStringOutput(),
				PrivateIpAddressAllocation: pulumi.String("Dynamic"),
				PublicIpAddressId:          webserver.PublicIP.ID(),
			},
		},
	}, pulumi.Parent(webserver))
	if err != nil {
		return nil, err
	}

	vmSize := args.VMSize
	if vmSize == nil {
		vmSize = pulumi.String("Standard_A0")
	}

	// Now create the VM, using the resource group and NIC allocated above.
	webserver.VM, err = compute.NewVirtualMachine(ctx, name+"-vm", &compute.VirtualMachineArgs{
		ResourceGroupName:            args.ResourceGroupName,
		NetworkInterfaceIds:          pulumi.StringArray{webserver.NetworkInterface.ID()},
		VmSize:                       vmSize,
		DeleteDataDisksOnTermination: pulumi.Bool(true),
		DeleteOsDiskOnTermination:    pulumi.Bool(true),
		OsProfile: compute.VirtualMachineOsProfileArgs{
			ComputerName:  pulumi.String("hostname"),
			AdminUsername: args.Username,
			AdminPassword: args.Password.ToStringOutput(),
			CustomData:    args.BootScript.ToStringOutput(),
		},
		OsProfileLinuxConfig: compute.VirtualMachineOsProfileLinuxConfigArgs{
			DisablePasswordAuthentication: pulumi.Bool(false),
		},
		StorageOsDisk: compute.VirtualMachineStorageOsDiskArgs{
			CreateOption: pulumi.String("FromImage"),
			Name:         pulumi.String(name + "-osdisk1"),
		},
		StorageImageReference: compute.VirtualMachineStorageImageReferenceArgs{
			Publisher: pulumi.String("canonical"),
			Offer:     pulumi.String("UbuntuServer"),
			Sku:       pulumi.String("16.04-LTS"),
			Version:   pulumi.String("latest"),
		},
	}, pulumi.Parent(webserver))
	if err != nil {
		return nil, err
	}

	return webserver, nil
}

func (ws *Webserver) GetIPAddress(ctx *pulumi.Context) pulumi.StringOutput {
	// The public IP address is not allocated until the VM is running, so wait for that resource to create, and then
	// lookup the IP address again to report its public IP.
	ready := pulumi.All(ws.VM.ID(), ws.PublicIP.Name, ws.PublicIP.ResourceGroupName)
	return ready.ApplyT(func(args []interface{}) (string, error) {
		name := args[1].(string)
		resourceGroupName := args[2].(string)
		ip, err := network.GetPublicIP(ctx, &network.GetPublicIPArgs{
			Name:              name,
			ResourceGroupName: resourceGroupName,
		})
		if err != nil {
			return "", err
		}
		return ip.IpAddress, nil
	}).(pulumi.StringOutput)
}
