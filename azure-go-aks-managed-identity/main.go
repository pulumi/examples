// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.
package main

import (
	"encoding/base64"

	"github.com/pulumi/pulumi-azure-native-sdk/authorization/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/containerservice/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/managedidentity/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi-tls/sdk/v4/go/tls"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// create a resource group to hold all the resources
		resourceGroup, err := resources.NewResourceGroup(ctx, "resourceGroup", nil)
		if err != nil {
			return err
		}

		// create a private key to use for the cluster's ssh key
		privateKey, err := tls.NewPrivateKey(ctx, "privateKey", &tls.PrivateKeyArgs{
			Algorithm: pulumi.String("RSA"),
			RsaBits:   pulumi.Int(4096),
		})

		if err != nil {
			return err
		}

		// create a user assigned identity to use for the cluster
		identity, err := managedidentity.NewUserAssignedIdentity(ctx, "identity", &managedidentity.UserAssignedIdentityArgs{
			ResourceGroupName: resourceGroup.Name,
		})

		if err != nil {
			return err
		}

		// create the cluster
		cluster, err := containerservice.NewManagedCluster(ctx, "cluster", &containerservice.ManagedClusterArgs{
			ResourceGroupName: resourceGroup.Name,
			Identity: &containerservice.ManagedClusterIdentityArgs{
				Type: containerservice.ResourceIdentityTypeUserAssigned,
				UserAssignedIdentities: pulumi.StringArray{
					identity.ID(),
				},
			},
			KubernetesVersion: pulumi.String("1.26.3"),
			DnsPrefix:         pulumi.String("dns-prefix"),
			EnableRBAC:        pulumi.Bool(true),
			AgentPoolProfiles: containerservice.ManagedClusterAgentPoolProfileArray{
				&containerservice.ManagedClusterAgentPoolProfileArgs{
					Name:         pulumi.String("agentpool"),
					Mode:         pulumi.String("System"),
					Count:        pulumi.Int(1),
					VmSize:       pulumi.String("Standard_A2_v2"),
					OsType:       pulumi.String("Linux"),
					OsDiskSizeGB: pulumi.Int(30),
					Type:         pulumi.String("VirtualMachineScaleSets"),
				},
			},
			LinuxProfile: &containerservice.ContainerServiceLinuxProfileArgs{
				AdminUsername: pulumi.String("aksuser"),
				Ssh: &containerservice.ContainerServiceSshConfigurationArgs{
					PublicKeys: containerservice.ContainerServiceSshPublicKeyArray{
						&containerservice.ContainerServiceSshPublicKeyArgs{
							KeyData: privateKey.PublicKeyOpenssh,
						},
					},
				},
			},
		})

		if err != nil {
			return err
		}

		// retrieve the admin credentials which contain the kubeconfig
		adminCredentials := containerservice.ListManagedClusterAdminCredentialsOutput(ctx, containerservice.ListManagedClusterAdminCredentialsOutputArgs{
			ResourceGroupName: resourceGroup.Name,
			ResourceName:      cluster.Name,
		}, nil)

		// grant the 'contributor' role to the identity on the resource group
		_, err = authorization.NewRoleAssignment(ctx, "roleAssignment", &authorization.RoleAssignmentArgs{
			PrincipalId:      identity.PrincipalId,
			PrincipalType:    pulumi.String("ServicePrincipal"),
			RoleDefinitionId: pulumi.String("/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"),
			Scope:            resourceGroup.ID(),
		})

		if err != nil {
			return err
		}

		ctx.Export("kubeconfig", adminCredentials.ApplyT(func(adminCredentials containerservice.ListManagedClusterAdminCredentialsResult) (pulumi.String, error) {
			value, _ := base64.StdEncoding.DecodeString(adminCredentials.Kubeconfigs[0].Value)
			return pulumi.String(value), nil
		}).(pulumi.StringOutput))

		return nil
	})
}
