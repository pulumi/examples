package main

import (
	"github.com/pulumi/pulumi-azure/sdk/v3/go/azure/containerservice"
	"github.com/pulumi/pulumi-azure/sdk/v3/go/azure/core"
	"github.com/pulumi/pulumi-azure/sdk/v3/go/azure/network"
	"github.com/pulumi/pulumi-azuread/sdk/v2/go/azuread"
	appsv1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/apps/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi-kubernetes/sdk/v2/go/kubernetes/providers"
	"github.com/pulumi/pulumi-random/sdk/v2/go/random"
	"github.com/pulumi/pulumi-tls/sdk/v2/go/tls"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		conf := config.New(ctx, "")

		kubernetesVersion, err := conf.Try("kubernetesVersion")
		if err != nil {
			kubernetesVersion = "1.16.9"
		}

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
			Subnets: network.VirtualNetworkSubnetArray{
				network.VirtualNetworkSubnetArgs{
					Name:          pulumi.String("subnet-1"),
					AddressPrefix: pulumi.String("10.2.1.0/24"),
				},
			},
		}
		vnet, err := network.NewVirtualNetwork(ctx, "vnet", &vnetArgs)
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
			VnetSubnetId: vnet.Subnets.Index(pulumi.Int(0)).Id(),
		}

		linuxProfileArgs := containerservice.KubernetesClusterLinuxProfileArgs{
			AdminUsername: pulumi.String("aksuser"),
			SshKey: containerservice.KubernetesClusterLinuxProfileSshKeyArgs{
				KeyData: sshKey.PublicKeyOpenssh,
			},
		}

		azureAdminPassword, err := random.NewRandomPassword(ctx, "admin-password", &random.RandomPasswordArgs{
			Length:  pulumi.Int(20),
			Special: pulumi.Bool(true),
		})
		windowsProfileArgs := containerservice.KubernetesClusterWindowsProfileArgs{
			AdminUsername: pulumi.String("azureuser"),
			AdminPassword: azureAdminPassword.Result,
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
			WindowsProfile:         windowsProfileArgs,
			ServicePrincipal:       spArgs,
			KubernetesVersion:      pulumi.String(kubernetesVersion),
			RoleBasedAccessControl: roleArgs,
			NetworkProfile:         networkArgs,
		}
		cluster, err := containerservice.NewKubernetesCluster(ctx, "aksCluster", &clusterArgs,
			pulumi.DependsOn([]pulumi.Resource{vnet}))
		if err != nil {
			return err
		}

		// Export the raw kube config.
		ctx.Export("kubeconfig", cluster.KubeConfigRaw)

		k8sProvider, err := providers.NewProvider(ctx, "k8sprovider", &providers.ProviderArgs{
			Kubeconfig: cluster.KubeConfigRaw,
		}, pulumi.DependsOn([]pulumi.Resource{cluster}))
		if err != nil {
			return err
		}

		ns, err := corev1.NewNamespace(ctx, "app-ns", &corev1.NamespaceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name: pulumi.String("example-ns"),
			},
		}, pulumi.Provider(k8sProvider))
		if err != nil {
			return err
		}

		appLabels := pulumi.StringMap{
			"app": pulumi.String("iac-workshop"),
		}
		_, err = appsv1.NewDeployment(ctx, "app-dep", &appsv1.DeploymentArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Namespace: ns.Metadata.Elem().Name(),
			},
			Spec: appsv1.DeploymentSpecArgs{
				Selector: &metav1.LabelSelectorArgs{
					MatchLabels: appLabels,
				},
				Replicas: pulumi.Int(3),
				Template: &corev1.PodTemplateSpecArgs{
					Metadata: &metav1.ObjectMetaArgs{
						Labels: appLabels,
					},
					Spec: &corev1.PodSpecArgs{
						Containers: corev1.ContainerArray{
							corev1.ContainerArgs{
								Name:  pulumi.String("iac-workshop"),
								Image: pulumi.String("jocatalin/kubernetes-bootcamp:v2"),
							}},
					},
				},
			},
		}, pulumi.Provider(k8sProvider))
		if err != nil {
			return err
		}

		service, err := corev1.NewService(ctx, "app-service", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Namespace: ns.Metadata.Elem().Name(),
				Labels:    appLabels,
			},
			Spec: &corev1.ServiceSpecArgs{
				Ports: corev1.ServicePortArray{
					corev1.ServicePortArgs{
						Port:       pulumi.Int(80),
						TargetPort: pulumi.Int(8080),
					},
				},
				Selector: appLabels,
				Type:     pulumi.String("LoadBalancer"),
			},
		}, pulumi.Provider(k8sProvider))
		if err != nil {
			return err
		}

		ctx.Export("url", service.Status.ApplyT(func(status *corev1.ServiceStatus) *string {
			ingress := status.LoadBalancer.Ingress[0]
			if ingress.Hostname != nil {
				return ingress.Hostname
			}
			return ingress.Ip
		}))

		return nil
	})
}
