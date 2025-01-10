// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

package main

import (
	"fmt"

	"github.com/pulumi/pulumi-azure-native-sdk/containerservice/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi-azuread/sdk/v4/go/azuread"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

type aksClusterConfig struct {
	name      string
	location  string
	nodeCount int
	nodeSize  string
}

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Set up configuration variables for this stack.
		c := config.New(ctx, "")
		password := c.Require("password")
		location := c.Get("location")
		if location == "" {
			location = "eastus"
		}
		sshPublicKey := c.Require("sshPublicKey")
		resourceGroup, err := resources.NewResourceGroup(ctx, "aks", &resources.ResourceGroupArgs{
			Location: pulumi.String(location),
		})
		if err != nil {
			return err
		}

		// Create the AD service principal for the Kubernetes cluster.
		adApp, err := azuread.NewApplication(ctx, "aks", &azuread.ApplicationArgs{
			DisplayName: pulumi.String("my-aks-multicluster"),
		})
		if err != nil {
			return err
		}

		adSp, err := azuread.NewServicePrincipal(ctx, "aksSp", &azuread.ServicePrincipalArgs{
			ApplicationId: adApp.ApplicationId,
		})
		if err != nil {
			return err
		}

		adSpPassword, err := azuread.NewServicePrincipalPassword(ctx, "aksSpPassword", &azuread.ServicePrincipalPasswordArgs{
			ServicePrincipalId: adSp.ID(),
			Value:              pulumi.String(password),
			EndDate:            pulumi.String("2099-01-01T00:00:00Z"),
		})
		if err != nil {
			return err
		}

		// Per-cluster configs
		aksClusterConfigs := [2]*aksClusterConfig{
			&aksClusterConfig{
				name:      "east",
				location:  "eastus",
				nodeCount: 2,
				nodeSize:  "Standard_D2_v2",
			},
			&aksClusterConfig{
				name:      "west",
				location:  "westus",
				nodeCount: 5,
				nodeSize:  "Standard_D2_v2",
			},
		}

		// Create the individual clusters
		k8sClusters := make([]*containerservice.ManagedCluster, len(aksClusterConfigs))

		for i, perClusterConfig := range aksClusterConfigs {
			cluster, err := containerservice.NewManagedCluster(ctx, fmt.Sprintf("aksCluster-%s", perClusterConfig.name), &containerservice.ManagedClusterArgs{

				// Global config arguments
				ResourceGroupName: resourceGroup.Name,
				LinuxProfile: &containerservice.ContainerServiceLinuxProfileArgs{
					AdminUsername: pulumi.String("aksuser"),
					Ssh: containerservice.ContainerServiceSshConfigurationArgs{
						PublicKeys: containerservice.ContainerServiceSshPublicKeyArray{
							containerservice.ContainerServiceSshPublicKeyArgs{
								KeyData: pulumi.String(sshPublicKey),
							},
						},
					},
				},
				ServicePrincipalProfile: &containerservice.ManagedClusterServicePrincipalProfileArgs{
					ClientId: adApp.ApplicationId,
					Secret:   adSpPassword.Value,
				},

				// Per-cluster config arguments
				Location: pulumi.String(perClusterConfig.location),
				AgentPoolProfiles: containerservice.ManagedClusterAgentPoolProfileArray{
					&containerservice.ManagedClusterAgentPoolProfileArgs{
						Name:   pulumi.String("aksagentpool"),
						Mode:   pulumi.String("System"),
						Count:  pulumi.Int(perClusterConfig.nodeCount),
						VmSize: pulumi.String(perClusterConfig.nodeSize),
					},
				},
				DnsPrefix:         pulumi.String(fmt.Sprintf("%s-kube", ctx.Stack())),
				KubernetesVersion: pulumi.String("1.26.3"),
			})
			if err != nil {
				return err
			}
			k8sClusters[i] = cluster
		}

		var aksClusterNames pulumi.StringArray
		for _, cluster := range k8sClusters {
			aksClusterNames = append(aksClusterNames, cluster.Name)
		}
		ctx.Export("aksClusterNames", aksClusterNames)
		return nil
	})
}
