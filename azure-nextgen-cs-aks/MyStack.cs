// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System;
using System.Text;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.AzureAD;
using Pulumi.AzureNextGen.ContainerService.Latest;
using Pulumi.AzureNextGen.ContainerService.Latest.Inputs;
using Pulumi.AzureNextGen.Resources.Latest;
using Pulumi.Random;
using Pulumi.Tls;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Pulumi.Config();
        var location = config.Get("location") ?? "WestUS";
        
        // Create an Azure Resource Group
        var resourceGroup = new ResourceGroup("resourceGroup", new ResourceGroupArgs
        {
            ResourceGroupName = "azure-nextgen-cs-aks",
            Location = location
        });

        // Create an AD service principal
        var adApp = new Application("aks");
        var adSp = new ServicePrincipal("aksSp", new ServicePrincipalArgs
        {
            ApplicationId = adApp.ApplicationId
        });
        
        // Generate random password
        var password = new RandomPassword("password", new RandomPasswordArgs
        {
            Length = 20,
            Special = true
        });
        
        // Create the Service Principal Password
        var adSpPassword = new ServicePrincipalPassword("aksSpPassword", new ServicePrincipalPasswordArgs
        {
            ServicePrincipalId = adSp.Id,
            Value = password.Result,
            EndDate = "2099-01-01T00:00:00Z"
        });
        
        // Generate an SSH key
        var sshKey = new PrivateKey("ssh-key", new PrivateKeyArgs
        {
            Algorithm = "RSA",
            RsaBits = 4096
        });
        
        var managedClusterName = config.Get("managedClusterName") ?? "azure-nextgen-aks";
        var cluster = new ManagedCluster("managedClusterResource", new ManagedClusterArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AddonProfiles = 
            {
                { "KubeDashboard", new ManagedClusterAddonProfileArgs { Enabled = true } }
            },
            AgentPoolProfiles = 
            {
                new ManagedClusterAgentPoolProfileArgs
                {
                    Count = 3,
                    MaxPods = 110,
                    Mode = "System",
                    Name = "agentpool",
                    OsDiskSizeGB = 30,
                    OsType = "Linux",
                    Type = "VirtualMachineScaleSets",
                    VmSize = "Standard_DS2_v2",
                }
            },
            DnsPrefix = "azurenextgenprovider",
            EnableRBAC = true,
            KubernetesVersion = "1.16.10",
            LinuxProfile = new ContainerServiceLinuxProfileArgs
            {
                AdminUsername = "testuser",
                Ssh = new ContainerServiceSshConfigurationArgs
                {
                    PublicKeys = 
                    {
                        new ContainerServiceSshPublicKeyArgs
                        {
                            KeyData = sshKey.PublicKeyOpenssh,
                        }
                    }
                }
            },
            Location = resourceGroup.Location,
            NodeResourceGroup = $"MC_azure-nextgen-cs_{managedClusterName}",
            ResourceName = managedClusterName,
            ServicePrincipalProfile = new ManagedClusterServicePrincipalProfileArgs
            {
                ClientId = adApp.ApplicationId,
                Secret = adSpPassword.Value
            }
        });

        // Export the KubeConfig
        this.KubeConfig = Output.Tuple(resourceGroup.Name, cluster.Name).Apply(names =>
            GetKubeConfig(names.Item1, names.Item2));
    }

    [Output]
    public Output<string> KubeConfig { get; set; }

    private static async Task<string> GetKubeConfig(string resourceGroupName, string clusterName)
    {
        var credentials = await ListManagedClusterUserCredentials.InvokeAsync(new ListManagedClusterUserCredentialsArgs
        {
            ResourceGroupName = resourceGroupName,
            ResourceName = clusterName
        });
        var encoded = credentials.Kubeconfigs[0].Value;
        var data = Convert.FromBase64String(encoded);
        return Encoding.UTF8.GetString(data);
    }
}
