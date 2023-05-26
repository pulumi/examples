// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using System.Collections.Immutable;
using Pulumi;
using Pulumi.AzureAD;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.ContainerService;
using Pulumi.AzureNative.ContainerService.V20190201;
using Pulumi.AzureNative.ContainerService.Inputs;
using ManagedCluster = Pulumi.AzureNative.ContainerService.ManagedCluster;
using ManagedClusterArgs = Pulumi.AzureNative.ContainerService.ManagedClusterArgs;

class MyStack : Stack
{
    public MyStack()
    {

        var config = new Pulumi.Config();

        // Per-cluster config
        var aksClusterConfigs = new[] {
            new {
                Name = "east",
                Location = "eastus",
                NodeCount = 2,
                NodeSize = ContainerServiceVMSizeTypes.Standard_D2_v2,
            },
            new {
                Name = "west",
                Location = "westus",
                NodeCount = 5,
                NodeSize = ContainerServiceVMSizeTypes.Standard_D2_v2,
            },
        };

        // Create an Azure Resource Group
        var resourceGroup = new ResourceGroup("aks", new ResourceGroupArgs
        {
            Location = config.Get("location") ?? "eastus",
        });

        // Create the AD service principal for the K8s cluster.
        var adApp = new Application("aks", new ApplicationArgs
        {
            DisplayName = "my-aks-multicluster",
        });
        var adSp = new ServicePrincipal("aksSp", new ServicePrincipalArgs
        {
            ApplicationId = adApp.ApplicationId
        });
        var adSpPassword = new ServicePrincipalPassword("aksSpPassword", new ServicePrincipalPasswordArgs
        {
            ServicePrincipalId = adSp.Id,
            Value = config.Require("password"),
            EndDate = "2099-01-01T00:00:00Z",
        });

        // Create the individual clusters
        var aksClusterNames = new List<Output<string>>();
        foreach (var perClusterConfig in aksClusterConfigs)
        {
            var cluster = new ManagedCluster($"aksCluster-{perClusterConfig.Name}", new ManagedClusterArgs
            {
                // Global config arguments
                ResourceGroupName = resourceGroup.Name,
                LinuxProfile = new ContainerServiceLinuxProfileArgs
                {
                    AdminUsername = "aksuser",
                    Ssh = new ContainerServiceSshConfigurationArgs
                    {
                        PublicKeys =
                        {
                            new ContainerServiceSshPublicKeyArgs
                            {
                                KeyData = config.Require("sshPublicKey"),
                            }
                        }
                    }
                },
                ServicePrincipalProfile = new ManagedClusterServicePrincipalProfileArgs
                {
                    ClientId = adApp.ApplicationId,
                    Secret = adSpPassword.Value
                },

                // Per-cluster config arguments
			    Location = perClusterConfig.Location,
                AgentPoolProfiles =
                {
                    new ManagedClusterAgentPoolProfileArgs
                    {
                        Mode = AgentPoolMode.System,
                        Name = "agentpool",
                        Count = perClusterConfig.NodeCount,
                        VmSize = perClusterConfig.NodeSize.ToString(),
                    }
                },
                DnsPrefix = $"{Pulumi.Deployment.Instance.StackName}-kube",
                KubernetesVersion = "1.26.3",
            });

            aksClusterNames.Add(cluster.Name);
        };

        this.aksClusterNames = Output.All(aksClusterNames);
    }

    [Output]
    public Output<ImmutableArray<string>> aksClusterNames { get; set; }
}
