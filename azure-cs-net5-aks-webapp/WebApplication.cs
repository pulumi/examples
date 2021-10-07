using System;
using System.Collections.Generic;
using System.Linq;
using Pulumi;
using Pulumi.AzureNative.Authorization;
using Pulumi.AzureNative.Authorization.Inputs;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using Pulumi.Docker;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using ContainerArgs = Pulumi.Kubernetes.Types.Inputs.Core.V1.ContainerArgs;
using Service = Pulumi.Kubernetes.Core.V1.Service;

record WebApplicationArgs
{
    public string? DockerImage { get; init; }
    public string? AppFolder { get; init; }
    public AksCluster? Cluster { get; init; }
}

class WebApplication : ComponentResource
{
    public WebApplication(string name, WebApplicationArgs args) : base("example:my:WebApplication", name)
    {
        var (imageName, registry) = EnsureDockerImage(args);
        this.Endpoint = args.Cluster != null
            ? DeployToCluster(args.Cluster, imageName, registry)
            : DeployToAppService(imageName, registry);
    }

    /// <summary>
    /// The URL of the web application.
    /// </summary>
    [Output] public Output<string> Endpoint { get; set; }

    private (Output<string>, Registry?) EnsureDockerImage(WebApplicationArgs args)
    {
        if (args.DockerImage != null)
            return (Output.Create(args.DockerImage), null);

        if (args.AppFolder == null)
            throw new ArgumentException("Specify DockerImage or AppFolder");

        var customImage = args.AppFolder.Replace("./", "");

        var registry = new Registry("myregistry", new()
        {
            ResourceGroupName = ResourceGroup.Name,
            Sku = new SkuArgs { Name = "Basic" },
            AdminUserEnabled = true
        }, new() { Parent = this });

        var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
        {
            ResourceGroupName = ResourceGroup.Name,
            RegistryName = registry.Name
        });
        var adminUsername = credentials.Apply(c => c.Username ?? "");
        var adminPassword = credentials.Apply(c => Output.CreateSecret(c.Passwords.First().Value ?? ""));

        var myImage = new Image(customImage, new()
        {
            ImageName = Output.Format($"{registry.LoginServer}/{customImage}:v1.0.0"),
            Build = new DockerBuild { Context = args.AppFolder },
            Registry = new ImageRegistry
            {
                Server = registry.LoginServer,
                Username = adminUsername,
                Password = adminPassword
            },
        }, new() { Parent = this });


        return (myImage.ImageName, registry);
    }

    private Output<string> DeployToAppService(Output<string> imageName, Registry? registry)
    {
        var plan = new AppServicePlan("asp", new()
        {
            ResourceGroupName = ResourceGroup.Name,
            Kind = "Linux",
            Reserved = true,
            Sku = new SkuDescriptionArgs
            {
                Name = "B1",
                Tier = "Basic"
            }
        }, new() { Parent = this });

        var appSettings = new List<NameValuePairArgs>
        {
            new NameValuePairArgs
            {
                Name = "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
                Value = "false"
            },
            new NameValuePairArgs
            {
                Name = "WEBSITES_PORT",
                Value = "80" // Our custom image exposes port 80. Adjust for your app as needed.
            }
        };

        if (registry != null)
        {
            var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
            {
                ResourceGroupName = ResourceGroup.Name,
                RegistryName = registry.Name
            });
            var adminUsername = credentials.Apply(c => c.Username ?? "");
            var adminPassword = credentials.Apply(c => Output.CreateSecret(c.Passwords.First().Value ?? ""));

            appSettings.Add(new NameValuePairArgs { Name = "DOCKER_REGISTRY_SERVER_URL", Value = Output.Format($"https://{registry.LoginServer}") });
            appSettings.Add(new NameValuePairArgs { Name = "DOCKER_REGISTRY_SERVER_USERNAME", Value = adminUsername });
            appSettings.Add(new NameValuePairArgs { Name = "DOCKER_REGISTRY_SERVER_PASSWORD", Value = adminPassword });
        }

        var app = new WebApp("hello-app", new()
        {
            ResourceGroupName = ResourceGroup.Name,
            ServerFarmId = plan.Id,
            SiteConfig = new SiteConfigArgs
            {
                AppSettings = appSettings,
                AlwaysOn = true,
                LinuxFxVersion = Output.Format($"DOCKER|{imageName}")
            },
            HttpsOnly = true,
        }, new() { Parent = this });

        return Output.Format($"https://{app.DefaultHostName}");
    }

    private Output<string> DeployToCluster(AksCluster cluster, Output<string> imageName, Registry? registry)
    {
        var deploymentDeps = new InputList<Resource>();
        if (registry != null)
        {
            var roleAssignment = new RoleAssignment("access-from-cluster", new()
            {
                PrincipalId = cluster.PrincipalId,
                RoleDefinitionId = "/subscriptions/0282681f-7a9e-424b-80b2-96babd57a8a1/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d",
                RoleAssignmentName = "7f95abcd-4ed3-4680-a7ca-43fe172d538d",
                Scope = registry.Id,
            }, new() { Parent = this });
            deploymentDeps.Add(roleAssignment);
        }

        var provider = new Pulumi.Kubernetes.Provider("k8s-provider", new()
        {
            KubeConfig = cluster.KubeConfig,
        }, new() { Parent = this });

        var labels = new InputMap<string> { { "app.kubernetes.io/component", "app" } };

        var appDeployment = new Pulumi.Kubernetes.Apps.V1.Deployment("app", new()
        {
            Metadata = new ObjectMetaArgs
            {
                Namespace = "default",
                Labels = labels
            },
            Spec = new DeploymentSpecArgs
            {
                Replicas = 1,
                Selector = new LabelSelectorArgs { MatchLabels = labels },
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs { Labels = labels },
                    Spec = new PodSpecArgs
                    {
                        Containers =
                        {
                            new ContainerArgs
                            {
                                Name = "web-app",
                                Image = imageName
                            }
                        }
                    }
                }
            }
        }, new CustomResourceOptions
        {
            Provider = provider,
            Parent = this,
            DependsOn = deploymentDeps
        });

        var appService = new Service("app", new()
        {
            Metadata = new ObjectMetaArgs
            {
                Namespace = "default",
                Labels = labels
            },
            Spec = new ServiceSpecArgs
            {
                Type = "LoadBalancer",
                Ports =
                {
                    new ServicePortArgs
                    {
                        Port = 80,
                        TargetPort = 80
                    }
                },
                Selector = labels
            }
        }, new CustomResourceOptions
        {
            Provider = provider,
            Parent = this,
            DependsOn = { appDeployment }
        });

        var appAddress = appService.Status.Apply(s => s.LoadBalancer.Ingress).GetAt(0).Apply(i => i.Ip);
        return Output.Format($"http://{appAddress}");
    }
}
