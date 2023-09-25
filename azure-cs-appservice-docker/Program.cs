// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
using System;
using Pulumi;
using System.Linq;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using Pulumi.AzureNative.Resources;
using Pulumi.AzureNative.Web;
using Pulumi.AzureNative.Web.Inputs;
using Pulumi.Docker;
using System.Collections.Generic;

return await Pulumi.Deployment.RunAsync(() =>
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
    // Scenario 1: deploying an image from Docker Hub.
    // The example uses a HelloWorld application written in Go.
    // Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
    //
    var imageInDockerHub = "microsoft/azure-appservices-go-quickstart";

    var helloApp = new WebApp("hello-app", new WebAppArgs
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
                    }
                },
            AlwaysOn = true,
            LinuxFxVersion = $"DOCKER|{imageInDockerHub}"
        },
        HttpsOnly = true
    });

    //
    // Scenario 2: deploying a custom image from Azure Container Registry.
    //
    var customImage = "node-app";

    var registry = new Registry("myregistry", new RegistryArgs
    {
        ResourceGroupName = resourceGroup.Name,
        Sku = new SkuArgs { Name = "Basic" },
        AdminUserEnabled = true
    });

    var credentials = GetRegistryCredentials(resourceGroup.Name, registry.Name);

    var myImage = new Image(customImage, new ImageArgs
    {
        ImageName = Output.Format($"{registry.LoginServer}/{customImage}:v1.0.0"),
        Build = new Pulumi.Docker.Inputs.DockerBuildArgs
        {
            Context = $"./{customImage}"
        },
        Registry = new Pulumi.Docker.Inputs.RegistryArgs 
        {
            Server = registry.LoginServer,
            Username = credentials.username,
            Password = credentials.password
        },
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
                        Value = credentials.username,
                    },
                    new NameValuePairArgs
                    {
                        Name = "DOCKER_REGISTRY_SERVER_PASSWORD",
                        Value = credentials.password,
                    },
                    new NameValuePairArgs
                    {
                        Name = "WEBSITES_PORT",
                        Value = "80" // Our custom image exposes port 80. Adjust for your app as needed.
                    }
                },
            AlwaysOn = true,
            LinuxFxVersion = Output.Format($"DOCKER|{myImage.ImageName}")
        },
        HttpsOnly = true
    });

    return new Dictionary<string, object?>
    {
        ["HelloEndpoint"] = Output.Format($"https://{helloApp.DefaultHostName}/hello"),
        ["GetStartedEndpoint"] = Output.Format($"https://{getStartedApp.DefaultHostName}"),
    };
});

(Output<string> username, Output<string> password) GetRegistryCredentials(Output<string> resourceGroupName, Output<string> registryName)
{
    var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
    {
        ResourceGroupName = resourceGroupName,
        RegistryName = registryName
    });

    var adminUsername = credentials.Apply(c => c.Username ?? "");
    var adminPassword = credentials.Apply(c => Output.CreateSecret(c.Passwords.First().Value ?? ""));
    return (adminUsername, adminPassword);
}
