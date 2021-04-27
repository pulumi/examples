// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package main

import (
	"encoding/base64"

	"github.com/pulumi/pulumi-azure-native/sdk/go/azure/containerservice"
	"github.com/pulumi/pulumi-azure-native/sdk/go/azure/resources"
	"github.com/pulumi/pulumi-azuread/sdk/v4/go/azuread"
	"github.com/pulumi/pulumi-random/sdk/v4/go/random"
	"github.com/pulumi/pulumi-tls/sdk/v4/go/tls"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create an Azure Resource Group
		resourceGroup, err := resources.NewResourceGroup(ctx, "azure-go-aks", nil)
		if err != nil {
			return err
		}

		// Create an AD service principal.
		adApp, err := azuread.NewApplication(ctx, "aks", &azuread.ApplicationArgs{
			DisplayName: pulumi.String("aks"),
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

		// Generate a random password.
		password, err := random.NewRandomPassword(ctx, "password", &random.RandomPasswordArgs{
			Length:  pulumi.Int(20),
			Special: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		// Create the Service Principal Password.
		adSpPassword, err := azuread.NewServicePrincipalPassword(ctx, "aksSpPassword", &azuread.ServicePrincipalPasswordArgs{
			ServicePrincipalId: adSp.ID(),
			Value:              password.Result,
			EndDate:            pulumi.String("2099-01-01T00:00:00Z"),
		})
		if err != nil {
			return err
		}

		// Generate an SSH key.
		sshArgs := tls.PrivateKeyArgs{
			Algorithm: pulumi.String("RSA"),
			RsaBits:   pulumi.Int(4096),
		}
		sshKey, err := tls.NewPrivateKey(ctx, "ssh-key", &sshArgs)
		if err != nil {
			return err
		}

		// Create the Azure Kubernetes Service cluster.
		cluster, err := containerservice.NewManagedCluster(ctx, "go-aks", &containerservice.ManagedClusterArgs{
			ResourceGroupName: resourceGroup.Name,
			AgentPoolProfiles: containerservice.ManagedClusterAgentPoolProfileArray{
				&containerservice.ManagedClusterAgentPoolProfileArgs{
					Name:         pulumi.String("agentpool"),
					Mode:         pulumi.String("System"),
					OsDiskSizeGB: pulumi.Int(30),
					Count:        pulumi.Int(3),
					VmSize:       pulumi.String("Standard_DS2_v2"),
					OsType:       pulumi.String("Linux"),
				},
			},
			LinuxProfile: &containerservice.ContainerServiceLinuxProfileArgs{
				AdminUsername: pulumi.String("testuser"),
				Ssh: containerservice.ContainerServiceSshConfigurationArgs{
					PublicKeys: containerservice.ContainerServiceSshPublicKeyArray{
						containerservice.ContainerServiceSshPublicKeyArgs{
							KeyData: sshKey.PublicKeyOpenssh,
						},
					},
				},
			},
			DnsPrefix: resourceGroup.Name,
			ServicePrincipalProfile: &containerservice.ManagedClusterServicePrincipalProfileArgs{
				ClientId: adApp.ApplicationId,
				Secret:   adSpPassword.Value,
			},
			KubernetesVersion: pulumi.String("1.18.14"),
		})
		if err != nil {
			return err
		}

		ctx.Export("kubeconfig", pulumi.All(cluster.Name, resourceGroup.Name, resourceGroup.ID()).ApplyT(func(args interface{}) (string, error) {
			clusterName := args.([]interface{})[0].(string)
			resourceGroupName := args.([]interface{})[1].(string)
			creds, err := containerservice.ListManagedClusterUserCredentials(ctx, &containerservice.ListManagedClusterUserCredentialsArgs{
				ResourceGroupName: resourceGroupName,
				ResourceName:      clusterName,
			})
			if err != nil {
				return "", err
			}
			encoded := creds.Kubeconfigs[0].Value
			kubeconfig, err := base64.StdEncoding.DecodeString(encoded)
			if err != nil {
				return "", err
			}
			return string(kubeconfig), nil
		}))

		return nil
	})
}
