package main

import (
	"fmt"

	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/containerservice"
	"github.com/pulumi/pulumi-azure/sdk/v4/go/azure/core"
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
		resourceGroup, err := core.NewResourceGroup(ctx, "aks", &core.ResourceGroupArgs{
			Location: pulumi.String(location),
		})
		if err != nil {
			return err
		}

		// Create the AD service principal for the K8s cluster.

		addAppArgs := azuread.ApplicationArgs{
			DisplayName: pulumi.String("aks"),
		}
		adApp, err := azuread.NewApplication(ctx, "aks", &addAppArgs)
		if err != nil {
			return err
		}

		adSpArgs := azuread.ServicePrincipalArgs{
			ApplicationId: adApp.ApplicationId,
		}
		adSp, err := azuread.NewServicePrincipal(ctx, "aksSp", &adSpArgs)
		if err != nil {
			return err
		}

		adSpPasswordArgs := azuread.ServicePrincipalPasswordArgs{
			ServicePrincipalId: adSp.ID(),
			Value:              pulumi.String(password),
			EndDate:            pulumi.String("2099-01-01T00:00:00Z"),
		}
		adSpPassword, err := azuread.NewServicePrincipalPassword(ctx, "aksSpPassword", &adSpPasswordArgs)
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
		k8sClusters := make([]*containerservice.KubernetesCluster, len(aksClusterConfigs))

		for i, perClusterConfig := range aksClusterConfigs {
			clusterArgs := containerservice.KubernetesClusterArgs{
				// Global config arguments
				ResourceGroupName: resourceGroup.Name,
				LinuxProfile: containerservice.KubernetesClusterLinuxProfileArgs{
					AdminUsername: pulumi.String("aksuser"),
					SshKey: containerservice.KubernetesClusterLinuxProfileSshKeyArgs{
						KeyData: pulumi.String(sshPublicKey),
					},
				},
				ServicePrincipal: containerservice.KubernetesClusterServicePrincipalArgs{
					ClientId:     adApp.ApplicationId,
					ClientSecret: adSpPassword.Value,
				},
				// Per-cluster config arguments
				Location: pulumi.String(perClusterConfig.location),
				DefaultNodePool: containerservice.KubernetesClusterDefaultNodePoolArgs{
					Name:      pulumi.String("aksagentpool"),
					NodeCount: pulumi.Int(perClusterConfig.nodeCount),
					VmSize:    pulumi.String(perClusterConfig.nodeSize),
				},
				DnsPrefix: pulumi.String(fmt.Sprintf("%s-kube", ctx.Stack())),
			}
			cluster, err := containerservice.NewKubernetesCluster(ctx, fmt.Sprintf("aksCluster-%s", perClusterConfig.name), &clusterArgs)
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
