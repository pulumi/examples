package main

import (
	"github.com/pulumi/pulumi-azure/sdk/go/azure/containerservice"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/core"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/network"
	"github.com/pulumi/pulumi-azuread/sdk/go/azuread"
	"github.com/pulumi/pulumi-random/sdk/go/random"
	"github.com/pulumi/pulumi-tls/sdk/go/tls"

	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a resource group.
		resourceGroup, err := core.NewResourceGroup(ctx, "aks-rg", nil)
		if err != nil {
			return err
		}

		// Create an AD service principal.
		adApp, err := azuread.NewApplication(ctx, "aks", nil)
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

		// Generate a random password.
		passwordArgs := random.RandomPasswordArgs{
			Length:  pulumi.Int(20),
			Special: pulumi.Bool(true),
		}
		password, err := random.NewRandomPassword(ctx, "password", &passwordArgs)
		if err != nil {
			return err
		}

		// Create the Service Principal Password.
		adSpPasswordArgs := azuread.ServicePrincipalPasswordArgs{
			ServicePrincipalId: adSp.ID(),
			Value:              password.Result,
			EndDate:            pulumi.String("2099-01-01T00:00:00Z"),
		}
		adSpPassword, err := azuread.NewServicePrincipalPassword(ctx, "aksSpPassword", &adSpPasswordArgs)
		if err != nil {
			return err
		}

		// Create a Virtual Network.
		vnetArgs := network.VirtualNetworkArgs{
			ResourceGroupName: resourceGroup.Name,
			AddressSpaces:     pulumi.StringArray{pulumi.String("10.2.0.0/16")},
		}
		vnet, err := network.NewVirtualNetwork(ctx, "vnet", &vnetArgs)
		if err != nil {
			return err
		}

		// Create a subnet.
		subnetArgs := network.SubnetArgs{
			ResourceGroupName:  resourceGroup.Name,
			VirtualNetworkName: vnet.Name,
			AddressPrefix:      pulumi.String("10.2.1.0/24"),
		}
		subnet, err := network.NewSubnet(ctx, "subnet", &subnetArgs)
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

		// Create our cluster specifications.
		defaultNodePoolArgs := containerservice.KubernetesClusterDefaultNodePoolArgs{
			Name:         pulumi.String("aksagentpool"),
			NodeCount:    pulumi.Int(3),
			VmSize:       pulumi.String("Standard_B2s"),
			OsDiskSizeGb: pulumi.Int(30),
			VnetSubnetId: subnet.ID(),
		}

		linuxProfileArgs := containerservice.KubernetesClusterLinuxProfileArgs{
			AdminUsername: pulumi.String("aksuser"),
			SshKey: containerservice.KubernetesClusterLinuxProfileSshKeyArgs{
				KeyData: sshKey.PublicKeyOpenssh,
			},
		}

		spArgs := containerservice.KubernetesClusterServicePrincipalArgs{
			ClientId:     adApp.ApplicationId,
			ClientSecret: adSpPassword.Value,
		}

		roleArgs := containerservice.KubernetesClusterRoleBasedAccessControlArgs{
			Enabled: pulumi.Bool(true),
		}

		networkArgs := containerservice.KubernetesClusterNetworkProfileArgs{
			NetworkPlugin:    pulumi.String("azure"),
			DnsServiceIp:     pulumi.String("10.2.2.254"),
			ServiceCidr:      pulumi.String("10.2.2.0/24"),
			DockerBridgeCidr: pulumi.String("172.17.0.1/16"),
		}

		// Allocate an AKS cluster.
		clusterArgs := containerservice.KubernetesClusterArgs{
			ResourceGroupName:      resourceGroup.Name,
			DefaultNodePool:        defaultNodePoolArgs,
			DnsPrefix:              pulumi.String("sampleaks"),
			LinuxProfile:           linuxProfileArgs,
			ServicePrincipal:       spArgs,
			KubernetesVersion:      pulumi.String("1.15.5"),
			RoleBasedAccessControl: roleArgs,
			NetworkProfile:         networkArgs,
		}
		cluster, err := containerservice.NewKubernetesCluster(ctx, "aksCluster", &clusterArgs)
		if err != nil {
			return err
		}

		// Export the raw kube config.
		ctx.Export("kubeconfig", cluster.KubeConfigRaw)
		return nil
	})
}
