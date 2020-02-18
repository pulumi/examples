// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.AzureAD;
using Pulumi.Azure.ContainerService;
using Pulumi.Azure.ContainerService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Network;
using Pulumi.Azure.Role;
using Pulumi.Random;
using Pulumi.Tls;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() => {
            var resourceGroup = new ResourceGroup("aks-rg");

            var password = new RandomPassword("password", new RandomPasswordArgs
            {
                Length = 20,
                Special = true,
            }).Result;

            var sshPublicKey = new PrivateKey("ssh-key", new PrivateKeyArgs
            {
                Algorithm = "RSA",
                RsaBits = 4096,
            }).PublicKeyOpenssh;

            // Create the AD service principal for the K8s cluster.
            var adApp = new Application("aks");
            var adSp = new ServicePrincipal("aksSp", new ServicePrincipalArgs { ApplicationId = adApp.ApplicationId });
            var adSpPassword = new ServicePrincipalPassword("aksSpPassword", new ServicePrincipalPasswordArgs
            {
                ServicePrincipalId = adSp.Id,
                Value = password,
                EndDate = "2099-01-01T00:00:00Z",
            });

            // Grant networking permissions to the SP (needed e.g. to provision Load Balancers)
            var assignment = new Assignment("role-assignment", new AssignmentArgs
            {
                PrincipalId = adSp.Id,
                Scope = resourceGroup.Id,
                RoleDefinitionName = "Network Contributor"
            });

            // Create a Virtual Network for the cluster
            var vnet = new VirtualNetwork("vnet", new VirtualNetworkArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AddressSpaces = { "10.2.0.0/16" },
            });

            // Create a Subnet for the cluster
            var subnet = new Subnet("subnet", new SubnetArgs
            {
                ResourceGroupName = resourceGroup.Name,
                VirtualNetworkName = vnet.Name,
                AddressPrefix = "10.2.1.0/24",
            });

            // Now allocate an AKS cluster.
            var cluster = new KubernetesCluster("aksCluster", new KubernetesClusterArgs
            {
                ResourceGroupName = resourceGroup.Name,
                DefaultNodePool = new KubernetesClusterDefaultNodePoolArgs
                {
                    Name = "aksagentpool",
                    NodeCount = 3,
                    VmSize = "Standard_B2s",
                    OsDiskSizeGb = 30,
                    VnetSubnetId = subnet.Id,
                },
                DnsPrefix = "sampleaks",
                LinuxProfile = new KubernetesClusterLinuxProfileArgs 
                {
                    AdminUsername = "aksuser",
                    SshKey = new KubernetesClusterLinuxProfileSshKeyArgs
                    {
                        KeyData = sshPublicKey,
                    },
                },
                ServicePrincipal = new KubernetesClusterServicePrincipalArgs 
                {
                    ClientId = adApp.ApplicationId,
                    ClientSecret = adSpPassword.Value,
                },
                KubernetesVersion = "1.15.7",
                RoleBasedAccessControl = new KubernetesClusterRoleBasedAccessControlArgs { Enabled = true },
                NetworkProfile = new KubernetesClusterNetworkProfileArgs 
                {
                    NetworkPlugin = "azure",
                    DnsServiceIp = "10.2.2.254",
                    ServiceCidr = "10.2.2.0/24",
                    DockerBridgeCidr = "172.17.0.1/16",
                },
            });

            return new Dictionary<string, object?>
            {
                {  "kubeconfig", cluster.KubeConfigRaw },
            };

        });
    }
}
