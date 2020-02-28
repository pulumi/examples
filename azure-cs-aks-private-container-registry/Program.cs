// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.AzureAD;
using Pulumi.Azure.ContainerService;
using Pulumi.Azure.ContainerService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Azure.Network;
using Pulumi.Azure.Role;
using Pulumi.Docker;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using Pulumi.Random;
using Pulumi.Tls;
using ContainerArgs = Pulumi.Kubernetes.Types.Inputs.Core.V1.ContainerArgs;
using SecretArgs = Pulumi.Kubernetes.Types.Inputs.Core.V1.SecretArgs;
using ServiceArgs = Pulumi.Kubernetes.Types.Inputs.Core.V1.ServiceArgs;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() =>
        {
            var resourceGroup = new ResourceGroup("aks-rg");

            var randomPassword = new RandomPassword("password", new RandomPasswordArgs
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
                Value = randomPassword,
                EndDate = "2099-01-01T00:00:00Z",
            });

            // Grant networking permissions to the SP (needed e.g. to provision Load Balancers).
            var assignment = new Assignment("role-assignment", new AssignmentArgs
            {
                PrincipalId = adSp.Id,
                Scope = resourceGroup.Id,
                RoleDefinitionName = "Network Contributor"
            });

            // Create a Virtual Network for the cluster.
            var vnet = new VirtualNetwork("vnet", new VirtualNetworkArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AddressSpaces = { "10.2.0.0/16" },
            });

            // Create a Subnet for the cluster.
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
                AgentPoolProfiles = new KubernetesClusterAgentPoolProfilesArgs
                {
                    Name = "aksagentpool",
                    Count = 3,
                    VmSize = "Standard_B2s",
                    OsDiskSizeGb = 30,
                    VnetSubnetId = subnet.Id
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

            // Create a k8s provider pointing to the kubeconfig.
            var k8sProvider = new Pulumi.Kubernetes.Provider("k8s", new Pulumi.Kubernetes.ProviderArgs
            {
                KubeConfig = cluster.KubeConfigRaw
            });

            var customResourceOptions = new CustomResourceOptions
            {
                Provider = k8sProvider
            };

            // Create a Container Registry.
            var registry = new Registry("acregistry", new RegistryArgs
            {
                ResourceGroupName = resourceGroup.Name,
                Sku = "Basic",
                AdminEnabled = true
            });

            // Build & push the sample application to the registry.
            var applicationName = "sample-application";
            var imageName = registry.LoginServer.Apply(value => $"{value}/{applicationName}");

            var image = new Image(applicationName, new ImageArgs
            {
                Build = "./SampleApplication",
                Registry = new ImageRegistry
                {
                    Server = registry.LoginServer,
                    Username = registry.AdminUsername,
                    Password = registry.AdminPassword
                },
                ImageName = imageName
            }, new ComponentResourceOptions
            {
                Provider = k8sProvider
            });

            // Create a k8s secret for use when pulling images from the container registry when deploying the sample application.
            var dockerCfg = Output.All<string>(registry.LoginServer, registry.AdminUsername, registry.AdminPassword).Apply(values =>
            {
                var r = new Dictionary<string, object>();
                var server = values[0];
                var username = values[1];
                var password = values[2];

                r[server] = new
                {
                    email = "notneeded@notneeded.com",
                    username,
                    password
                };

                return r;
            });

            var dockerCfgString = dockerCfg.Apply(x =>
                Convert.ToBase64String(Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(x))));

            var dockerCfgSecretName = "dockercfg-secret";

            var dockerCfgSecret = new Pulumi.Kubernetes.Core.V1.Secret(dockerCfgSecretName, new SecretArgs
            {
                Data =
                {
                    { ".dockercfg", dockerCfgString }
                },
                Type = "kubernetes.io/dockercfg",
                Metadata = new ObjectMetaArgs
                {
                    Name = dockerCfgSecretName,
                }
            }, customResourceOptions);

            // Deploy the sample application to the cluster.
            var labels = new InputMap<string>
            {
                { "app", $"app-{applicationName}" },
            };

            var deployment = new Pulumi.Kubernetes.Apps.V1.Deployment(applicationName, new DeploymentArgs
            {
                Spec = new DeploymentSpecArgs
                {
                    Selector = new LabelSelectorArgs
                    {
                        MatchLabels = labels,
                    },
                    Replicas = 1,
                    Template = new PodTemplateSpecArgs
                    {
                        Metadata = new ObjectMetaArgs
                        {
                            Labels = labels,
                            Name = applicationName
                        },
                        Spec = new PodSpecArgs
                        {
                            Containers = new List<ContainerArgs>
                            {
                                new ContainerArgs
                                {
                                    Name = applicationName,
                                    Image = image.ImageName,
                                }
                            },
                            ImagePullSecrets = new LocalObjectReferenceArgs
                            {
                                Name = dockerCfgSecretName
                            }
                        }
                    }
                }
            }, customResourceOptions);

            // Create a new service.
            var service = new Pulumi.Kubernetes.Core.V1.Service(applicationName, new ServiceArgs
            {
                Metadata = new ObjectMetaArgs
                {
                    Name = applicationName,
                    Labels = labels
                },
                Spec = new ServiceSpecArgs
                {
                    Type = "LoadBalancer",
                    Selector = deployment.Spec.Apply(x => x.Template.Metadata.Labels),
                    Ports = new ServicePortArgs
                    {
                        Port = 80
                    }
                }
            }, customResourceOptions);

            return new Dictionary<string, object?>
            {
                ["kubeconfig"] = cluster.KubeConfigRaw,
                ["dockercfg-secret-name"] = dockerCfgSecret.Metadata.Apply(x => x.Name),
            };
        });
    }
}