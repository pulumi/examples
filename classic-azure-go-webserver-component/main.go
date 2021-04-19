// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

package main

import (
	"fmt"

	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/core"
	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/network"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

// Get the desired username and password for our webserver VMs.
func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		config := config.New(ctx, "")

		count := config.GetInt("count")
		if count == 0 {
			count = 2
		}
		username := config.Require("username")
		password := config.Require("password")

		// All resources will share a resource group.
		rg, err := core.NewResourceGroup(ctx, "server-rg", nil)
		if err != nil {
			return err
		}

		// Create a network and subnet for all VMs.
		network, err := network.NewVirtualNetwork(ctx, "server-network", &network.VirtualNetworkArgs{
			ResourceGroupName: rg.Name,
			AddressSpaces:     pulumi.StringArray{pulumi.String("10.0.0.0/16")},
			Subnets: network.VirtualNetworkSubnetArray{
				network.VirtualNetworkSubnetArgs{
					Name:          pulumi.String("default"),
					AddressPrefix: pulumi.String("10.0.1.0/24"),
				},
			},
		})

		subnetID := network.Subnets.Index(pulumi.Int(0)).Id().ApplyT(func(val *string) (string, error) {
			if val == nil {
				return "", nil
			}
			return *val, nil
		}).(pulumi.StringOutput)

		// Now, allocate a few websever VMs -- by default, just 2, but this is configurable.
		var ipAddresses pulumi.StringArray
		for i := 0; i < count; i++ {
			server, err := NewWebserver(ctx, fmt.Sprintf("ws-%v", i), &WebserverArgs{
				Username: pulumi.String(username),
				Password: pulumi.String(password),
				BootScript: pulumi.String(fmt.Sprintf(`#!/bin/bash
echo "Hello, from Server %v!" > index.html
nohup python -m SimpleHTTPServer 80 &`, i)),
				ResourceGroupName: rg.Name,
				SubnetID:          subnetID,
			})
			if err != nil {
				return err
			}
			ipAddresses = append(ipAddresses, server.GetIPAddress(ctx))
		}

		ctx.Export("ipAddresses", ipAddresses)
		return nil
	})
}
