// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using Pulumi.AzureNative.OperationalInsights;
using Pulumi.AzureNative.OperationalInsights.Inputs;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.App;
using Pulumi.AzureNative.App.Inputs;
using Pulumi.Docker;
using ContainerArgs = Pulumi.AzureNative.App.Inputs.ContainerArgs;
using SecretArgs = Pulumi.AzureNative.App.Inputs.SecretArgs;

class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new ResourceGroup("rg");
        
        var workspace = new Workspace("loganalytics", new WorkspaceArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new WorkspaceSkuArgs { Name = "PerGB2018" },
            RetentionInDays = 30,
        });
        
        var workspaceSharedKeys = Output.Tuple(resourceGroup.Name, workspace.Name).Apply(items =>
            GetSharedKeys.InvokeAsync(new GetSharedKeysArgs
            {
                ResourceGroupName = items.Item1,
                WorkspaceName = items.Item2,
            }));
        
        var managedEnv = new ManagedEnvironment("env", new ManagedEnvironmentArgs
        {
            ResourceGroupName = resourceGroup.Name,
            AppLogsConfiguration = new AppLogsConfigurationArgs
            {
                Destination = "log-analytics",
                LogAnalyticsConfiguration = new LogAnalyticsConfigurationArgs
                {
                    CustomerId = workspace.CustomerId,
                    SharedKey = workspaceSharedKeys.Apply(r => r.PrimarySharedKey)
                }
            }
        });
        
        var registry = new Registry("registry", new RegistryArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuArgs { Name = "Basic" },
            AdminUserEnabled = true
        });
        
        var credentials = Output.Tuple(resourceGroup.Name, registry.Name).Apply(items =>
            ListRegistryCredentials.InvokeAsync(new ListRegistryCredentialsArgs
            {
                ResourceGroupName = items.Item1,
                RegistryName = items.Item2
            }));
        var adminUsername = credentials.Apply(credentials => credentials.Username);
        var adminPassword = credentials.Apply(credentials => credentials.Passwords[0].Value);

        var customImage = "node-app";
        var myImage = new Image(customImage, new ImageArgs
        {
            ImageName = Output.Format($"{registry.LoginServer}/{customImage}:v1.0.0"),
            Build = new DockerBuild { Context = $"./{customImage}" },
            Registry = new ImageRegistry
            {
                Server = registry.LoginServer,
                Username = adminUsername,
                Password = adminPassword
            }
        });
        
        var containerApp = new ContainerApp("app", new ContainerAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ManagedEnvironmentId = managedEnv.Id,
            Configuration = new ConfigurationArgs
            {
                Ingress = new IngressArgs
                {
                    External = true,
                    TargetPort = 80
                },
                Registries =
                {
                    new RegistryCredentialsArgs
                    {
                        Server = registry.LoginServer,
                        Username = adminUsername,
                        PasswordSecretRef = "pwd",
                    }
                },
                Secrets = 
                {
                    new SecretArgs
                    {
                        Name = "pwd",
                        Value = adminPassword
                    }
                },
            },
            Template = new TemplateArgs
            {
                Containers = 
                {
                    new ContainerArgs
                    {
                        Name = "myapp",
                        Image = myImage.ImageName,
                    }
                }
            }
        });

        this.Url = Output.Format($"https://{containerApp.Configuration.Apply(c => c.Ingress).Apply(i => i.Fqdn)}");
    }

    [Output("url")]
    public Output<string> Url { get; set; }
}
