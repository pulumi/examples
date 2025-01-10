// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
//
// Functions to provision and interact with an AKS cluster.

package main

import (
	"encoding/base64"

	cs "github.com/pulumi/pulumi-azure-native-sdk/containerservice/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi-azuread/sdk/v4/go/azuread"
	"github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type ClusterInfo struct {
	ManagedCluster *cs.ManagedCluster
	ResourceGroup  *resources.ResourceGroup
}

func buildCluster(ctx *pulumi.Context, cfg Config) (*ClusterInfo, error) {
	resourceGroup, err := resources.NewResourceGroup(ctx, "rg", nil)
	if err != nil {
		return nil, err
	}

	adApp, err := azuread.NewApplication(ctx, "app",
		&azuread.ApplicationArgs{
			DisplayName: pulumi.String("app"),
		})
	if err != nil {
		return nil, err
	}

	adSp, err := azuread.NewServicePrincipal(ctx, "service-principal",
		&azuread.ServicePrincipalArgs{
			ApplicationId: adApp.ApplicationId,
		})
	if err != nil {
		return nil, err
	}

	adSpPassword, err := azuread.NewServicePrincipalPassword(ctx, "sp-password",
		&azuread.ServicePrincipalPasswordArgs{
			ServicePrincipalId: adSp.ID(),
			Value:              cfg.Password,
			EndDate:            pulumi.String("2099-01-01T00:00:00Z"),
		})
	if err != nil {
		return nil, err
	}

	k8sCluster, err := cs.NewManagedCluster(ctx, "cluster",
		&cs.ManagedClusterArgs{
			ResourceGroupName: resourceGroup.Name,
			AgentPoolProfiles: cs.ManagedClusterAgentPoolProfileArray{
				cs.ManagedClusterAgentPoolProfileArgs{
					Count:        pulumi.Int(cfg.NodeCount),
					VmSize:       pulumi.String(cfg.NodeSize),
					MaxPods:      pulumi.Int(110),
					Mode:         pulumi.String("System"),
					Name:         pulumi.String("agentpool"),
					OsDiskSizeGB: pulumi.Int(30),
					OsType:       pulumi.String("Linux"),
					Type:         pulumi.String("VirtualMachineScaleSets"),
				},
			},
			DnsPrefix:         resourceGroup.Name,
			EnableRBAC:        pulumi.Bool(true),
			KubernetesVersion: pulumi.String(cfg.K8sVersion),
			LinuxProfile: cs.ContainerServiceLinuxProfileArgs{
				AdminUsername: pulumi.String(cfg.AdminUserName),
				Ssh: cs.ContainerServiceSshConfigurationArgs{
					PublicKeys: cs.ContainerServiceSshPublicKeyArray{
						cs.ContainerServiceSshPublicKeyArgs{
							KeyData: cfg.SshPublicKey,
						},
					},
				},
			},
			NodeResourceGroup: pulumi.String("node-resource-group"),
			ServicePrincipalProfile: cs.ManagedClusterServicePrincipalProfileArgs{
				ClientId: adApp.ApplicationId,
				Secret:   adSpPassword.Value,
			},
		})

	return &ClusterInfo{
		ManagedCluster: k8sCluster,
		ResourceGroup:  resourceGroup,
	}, nil
}

func getKubeconfig(ctx *pulumi.Context, cluster *ClusterInfo) pulumi.StringOutput {
	creds := cs.ListManagedClusterUserCredentialsOutput(ctx,
		cs.ListManagedClusterUserCredentialsOutputArgs{
			ResourceGroupName: cluster.ResourceGroup.Name,
			ResourceName:      cluster.ManagedCluster.Name,
		},
	)
	kubeconfig := creds.Kubeconfigs().Index(pulumi.Int(0)).Value().
		ApplyT(func(arg string) string {
			kubeconfig, err := base64.StdEncoding.DecodeString(arg)
			if err != nil {
				return ""
			}
			return string(kubeconfig)
		}).(pulumi.StringOutput)
	return kubeconfig
}

func buildProvider(
	ctx *pulumi.Context,
	cluster *ClusterInfo,
	kubeConfig pulumi.StringOutput) (*kubernetes.Provider, error) {

	return kubernetes.NewProvider(ctx, "k8s-provider", &kubernetes.ProviderArgs{
		Kubeconfig: kubeConfig,
	})
}
