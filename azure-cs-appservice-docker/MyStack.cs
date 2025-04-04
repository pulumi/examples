// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.
using System.Linq;
using Pulumi;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using DockerBuild = Pulumi.DockerBuild;


class MyStack : Stack
{
    public MyStack()
    {
        var resourceGroup = new ResourceGroup("appservice-docker-rg");

        var plan = new AppServicePlan("linux-apps", new AppServicePlanArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Kind = "Linux",
            Reserved = true,
            Sku = new SkuDescriptionArgs
            {
                Name = "B1",
                Tier = "Basic"
            }
        });

        //
        // Scenario 1: deploying a custom image from Azure Container Registry.
        //
        var customImage = "node-app";

        var registry = new Registry("myregistry", new Pulumi.AzureNative.ContainerRegistry.RegistryArgs
        {
            ResourceGroupName = resourceGroup.Name,
            Sku = new SkuArgs { Name = "Basic" },
            AdminUserEnabled = true
        });

        var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
        {
            ResourceGroupName = resourceGroup.Name,
            RegistryName = registry.Name
        });
        var adminUsername = credentials.Apply(c => c.Username ?? "");
        var adminPassword = credentials.Apply(c => Output.CreateSecret(c.Passwords.First().Value ?? ""));

        var myImage = new DockerBuild.Image(customImage, new Pulumi.DockerBuild.ImageArgs
        {
            Context = new DockerBuild.Inputs.BuildContextArgs
            {
                Location = $"./{customImage}",
            },
            Tags = new[]
            {
                Output.Format($"{registry.LoginServer}/{customImage}:v1.0.0"),
            },
            Push = true,
            Registries = new[]{
                new DockerBuild.Inputs.RegistryArgs
                {
                    Address = registry.LoginServer,
                    Username = adminUsername,
                    Password = adminPassword,
                }
            }
        });

        var getStartedApp = new WebApp("get-started", new WebAppArgs
        {
            ResourceGroupName = resourceGroup.Name,
            ServerFarmId = plan.Id,
            SiteConfig = new SiteConfigArgs
            {
                AppSettings = new[]
                {
                    new NameValuePairArgs
                    {
                        Name = "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
                        Value = "false"
                    },
                    new NameValuePairArgs
                    {
                        Name = "DOCKER_REGISTRY_SERVER_URL",
                        Value = Output.Format($"https://{registry.LoginServer}")
                    },
                    new NameValuePairArgs
                    {
                        Name = "DOCKER_REGISTRY_SERVER_USERNAME",
                        Value = adminUsername
                    },
                    new NameValuePairArgs
                    {
                        Name = "DOCKER_REGISTRY_SERVER_PASSWORD",
                        Value = adminPassword
                    },
                    new NameValuePairArgs
                    {
                        Name = "WEBSITES_PORT",
                        Value = "80" // Our custom image exposes port 80. Adjust for your app as needed.
                    }
                },
                AlwaysOn = true,
                LinuxFxVersion = Output.Format($"DOCKER|{myImage.Ref}")
            },
            HttpsOnly = true
        });

        this.GetStartedEndpoint = Output.Format($"https://{getStartedApp.DefaultHostName}");
    }

    [Output] public Output<string> GetStartedEndpoint { get; set; }
}
