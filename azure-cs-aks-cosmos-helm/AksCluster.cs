// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System;
using System.Text;

using Pulumi;
using Pulumi.AzureAD;
using Pulumi.AzureNative.ContainerService;
using Pulumi.AzureNative.ContainerService.Inputs;
using Pulumi.AzureNative.Resources;
using Pulumi.Random;
using Pulumi.Tls;
using K8s = Pulumi.Kubernetes;

public class AksCluster : ComponentResource
{
    public Output<string> ClusterName { get; set; }
    public Output<string> KubeConfig { get; set; }
    public K8s.Provider Provider { get; set; }

    public AksCluster(string name, AksClusterArgs args)
        : base("example:component:AksCluster", name)
    {
        var adApp = new Application("app", new ApplicationArgs
        {
            DisplayName = "aks-cosmos"
        }, new CustomResourceOptions { Parent = this });

        var adSp = new ServicePrincipal("service-principal", new ServicePrincipalArgs
        {
            ApplicationId = adApp.ApplicationId
        }, new CustomResourceOptions { Parent = this });

        var pw = new RandomPassword("pw", new RandomPasswordArgs
        {
            Length = 20,
            Special = true
        }, new CustomResourceOptions { Parent = this });

        var adSpPassword = new ServicePrincipalPassword("sp-password", new ServicePrincipalPasswordArgs
        {
            ServicePrincipalId = adSp.Id,
            Value = pw.Result,
            EndDate = "2099-01-01T00:00:00Z"
        }, new CustomResourceOptions { Parent = this });

        var keyPair = new PrivateKey("ssh-key", new PrivateKeyArgs
        {
            Algorithm = "RSA",
            RsaBits = 4096
        }, new CustomResourceOptions { Parent = this });

        var k8sCluster = new ManagedCluster(name, new ManagedClusterArgs
        {
            ResourceGroupName = args.ResourceGroupName,
            AddonProfiles =
            {
                ["KubeDashboard"] = new ManagedClusterAddonProfileArgs { Enabled = true }
            },
            AgentPoolProfiles =
            {
                 new ManagedClusterAgentPoolProfileArgs
                 {
                     Count = args.NodeCount,
                     VmSize = args.NodeSize,
                     MaxPods = 110,
                     Mode = "System",
                     Name = "agentpool",
                     OsDiskSizeGB = 30,
                     OsType = "Linux",
                     Type = "VirtualMachineScaleSets"
                 }
            },
            DnsPrefix = args.ResourceGroupName,
            EnableRBAC = true,
            KubernetesVersion = args.KubernetesVersion,
            LinuxProfile = new ContainerServiceLinuxProfileArgs
            {
                AdminUsername = "testuser",
                Ssh = new ContainerServiceSshConfigurationArgs
                {
                    PublicKeys = new ContainerServiceSshPublicKeyArgs
                    {
                        KeyData = keyPair.PublicKeyOpenssh
                    }
                }
            },
            NodeResourceGroup = $"{name}-node-rg",
            ServicePrincipalProfile = new ManagedClusterServicePrincipalProfileArgs
            {
                ClientId = adApp.ApplicationId,
                Secret = adSpPassword.Value
            }
        }, new CustomResourceOptions { Parent = this });

        this.ClusterName = k8sCluster.Name;

        this.KubeConfig = ListManagedClusterUserCredentials.Invoke(
            new ListManagedClusterUserCredentialsInvokeArgs
            {
                ResourceGroupName = args.ResourceGroupName,
                ResourceName = k8sCluster.Name
            })
            .Apply(x => x.Kubeconfigs[0].Value)
            .Apply(Convert.FromBase64String)
            .Apply(Encoding.UTF8.GetString);

        this.Provider = new K8s.Provider("k8s-provider", new K8s.ProviderArgs
        {
            KubeConfig = this.KubeConfig
        }, new CustomResourceOptions { Parent = this });
    }
}

public class AksClusterArgs
{
    public Input<string> ResourceGroupName { get; set; }
    public string KubernetesVersion { get; set; }
    public int NodeCount { get; set; }
    public string NodeSize { get; set; }
}
