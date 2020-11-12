﻿using System;
using System.Text;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.AzureAD;
using Pulumi.AzureNextGen.ContainerService.Latest;
using Pulumi.AzureNextGen.ContainerService.Latest.Inputs;
using Pulumi.Random;
using Pulumi.Tls;

record AksClusterArgs
{
    public string? VmSize { get; init; }
    public int? VmCount { get; init; }
    public string? KubernetesVersion { get; init; }
}

class AksCluster : ComponentResource
{
    public AksCluster(string name, AksClusterArgs? args = default) : base("example:my:AksCluster", name)
    {
        var adApp = new Application("aks", null, new() { Parent = this });
        var adSp = new ServicePrincipal("aksSp", new()
        {
            ApplicationId = adApp.ApplicationId,
        }, new() { Parent = this });

        // Generate random password
        var password = new RandomPassword("password", new()
        {
            Length = 20,
            Special = true
        }, new() { Parent = this });

        // Create the Service Principal Password
        var adSpPassword = new ServicePrincipalPassword("aksSpPassword", new()
        {
            ServicePrincipalId = adSp.Id,
            Value = password.Result,
            EndDate = "2099-01-01T00:00:00Z"
        }, new() { Parent = this });

        // Generate an SSH key
        var sshKey = new PrivateKey("ssh-key", new PrivateKeyArgs
        {
            Algorithm = "RSA",
            RsaBits = 4096
        }, new() { Parent = this });

        var cluster = new ManagedCluster("managedCluster", new()
        {
            ResourceGroupName = ResourceGroup.Name,
            AddonProfiles =
            {
                { "KubeDashboard", new ManagedClusterAddonProfileArgs { Enabled = true } }
            },
            AgentPoolProfiles =
            {
                new ManagedClusterAgentPoolProfileArgs
                {
                    Count = args?.VmCount ?? 3,
                    MaxPods = 110,
                    Mode = "System",
                    Name = "agentpool",
                    OsDiskSizeGB = 30,
                    OsType = "Linux",
                    Type = "VirtualMachineScaleSets",
                    VmSize = args?.VmSize ?? "Standard_DS2_v2",
                }
            },
            DnsPrefix = "demoapppulumiaks",
            EnableRBAC = true,
            Identity = new ManagedClusterIdentityArgs { Type ="SystemAssigned" },
            KubernetesVersion = args?.KubernetesVersion ?? "1.16.13",
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
            Location = ResourceGroup.Location,
            NodeResourceGroup = "MC_demoapppulumiaks",
            ResourceName = "demoapppulumiaks",
            ServicePrincipalProfile = new ManagedClusterServicePrincipalProfileArgs
            {
                ClientId = adApp.ApplicationId,
                Secret = adSpPassword.Value
            }
        }, new() { Parent = this });

        // Export the KubeConfig and SP
        this.KubeConfig = Output.Tuple(ResourceGroup.Name, cluster.Name).Apply(names =>
            GetKubeConfig(names.Item1, names.Item2));
        this.PrincipalId = cluster.IdentityProfile.Apply(p => p!["kubeletidentity"].ObjectId!);
    }

    [Output]
    public Output<string> KubeConfig { get; set; }
    [Output]
    public Output<string> PrincipalId { get; set; }

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
