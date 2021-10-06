// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Text;

using Pulumi;
using Pulumi.AzureAD;
using Pulumi.AzureNative.ContainerService;
using Pulumi.AzureNative.ContainerService.Inputs;
using Pulumi.AzureNative.Resources;
using K8s = Pulumi.Kubernetes;

class MyCluster
{
    public Output<string> ClusterName { get; set; }
    public Output<string> Kubeconfig { get; set; }

    public K8s.Provider Provider { get; set; }

    public MyCluster(MyConfig cfg)
    {
        var resourceGroup = new ResourceGroup("rg");

        var adApp = new Application("app", new ApplicationArgs
        {
            DisplayName = "app"
        });

        var adSp = new ServicePrincipal("service-principal", new ServicePrincipalArgs
        {
            ApplicationId = adApp.ApplicationId
        });

        var adSpPassword = new ServicePrincipalPassword("sp-password", new ServicePrincipalPasswordArgs
        {
            ServicePrincipalId = adSp.Id,
            Value = cfg.Password,
            EndDate = "2099-01-01T00:00:00Z"
        });

        var k8sCluster = new ManagedCluster("cluster", new ManagedClusterArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AddonProfiles =
            {
                ["KubeDashboard"] = new ManagedClusterAddonProfileArgs { Enabled = true }
            },
            AgentPoolProfiles =
            {
                 new ManagedClusterAgentPoolProfileArgs
                 {
                     Count = cfg.NodeCount,
                     VmSize = cfg.NodeSize,
                     MaxPods = 110,
                     Mode = "System",
                     Name = "agentpool",
                     OsDiskSizeGB = 30,
                     OsType = "Linux",
                     Type = "VirtualMachineScaleSets"
                 }
            },
            DnsPrefix = resourceGroup.Name,
            EnableRBAC = true,
            KubernetesVersion = cfg.K8SVersion,
            LinuxProfile = new ContainerServiceLinuxProfileArgs
            {
                AdminUsername = cfg.AdminUserName,
                Ssh = new ContainerServiceSshConfigurationArgs
                {
                    PublicKeys = new ContainerServiceSshPublicKeyArgs
                    {
                        KeyData = cfg.SshPublicKey
                    }
                }
            },
            NodeResourceGroup = "node-resource-group",
            ServicePrincipalProfile = new ManagedClusterServicePrincipalProfileArgs
            {
                ClientId = adApp.ApplicationId,
                Secret = adSpPassword.Value
            }
        });

        this.ClusterName = k8sCluster.Name;

        this.Kubeconfig = ListManagedClusterUserCredentials.Invoke(
            new ListManagedClusterUserCredentialsInvokeArgs
            {
                ResourceGroupName = resourceGroup.Name,
                ResourceName = k8sCluster.Name
            })
            .Apply(x => x.Kubeconfigs[0].Value)
            .Apply(Convert.FromBase64String)
            .Apply(Encoding.UTF8.GetString);

        this.Provider = new K8s.Provider("k8s-provider", new K8s.ProviderArgs
        {
            KubeConfig = Kubeconfig
        });
    }
}
