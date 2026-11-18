// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using Pulumi;
using Pulumi.AzureNative.App;
using Pulumi.AzureNative.App.Inputs;
using Pulumi.AzureNative.ContainerRegistry;
using ResourceGroup = Pulumi.AzureNative.Resources.ResourceGroup;

return await Deployment.RunAsync(() =>
{
    var config = new Config();

    // Set by the pipeline from the image stack's outputs: the image, pinned by
    // digest, and the registry it lives in.
    var imageRef = config.Require("imageRef");
    var registryName = config.Require("registryName");
    var registryResourceGroupName = config.Require("resourceGroupName");

    var resourceGroup = new ResourceGroup("rg");

    var environment = new ManagedEnvironment("env", new ManagedEnvironmentArgs
    {
        ResourceGroupName = resourceGroup.Name,
    });

    // Look the registry's admin credentials up here rather than passing them
    // through the pipeline, which only carries plain config values.
    var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
    {
        ResourceGroupName = registryResourceGroupName,
        RegistryName = registryName,
    });

    var app = new ContainerApp("app", new ContainerAppArgs
    {
        ResourceGroupName = resourceGroup.Name,
        ManagedEnvironmentId = environment.Id,
        Configuration = new ConfigurationArgs
        {
            Ingress = new IngressArgs
            {
                External = true,
                TargetPort = 8080,
            },
            Registries =
            {
                new RegistryCredentialsArgs
                {
                    Server = $"{registryName}.azurecr.io",
                    Username = credentials.Apply(c => c.Username!),
                    PasswordSecretRef = "acr-password",
                },
            },
            Secrets =
            {
                new SecretArgs
                {
                    Name = "acr-password",
                    Value = Output.CreateSecret(credentials.Apply(c => c.Passwords[0].Value!)),
                },
            },
        },
        Template = new TemplateArgs
        {
            Containers =
            {
                new ContainerArgs
                {
                    Name = "app",
                    // A new digest creates a new revision.
                    Image = imageRef,
                    Resources = new ContainerResourcesArgs { Cpu = 0.25, Memory = "0.5Gi" },
                },
            },
            Scale = new ScaleArgs { MinReplicas = 1, MaxReplicas = 1 },
        },
    });

    return new Dictionary<string, object?>
    {
        // Configuration is secret because it holds the registry password; the
        // ingress host name is not.
        ["url"] = Output.Unsecret(app.Configuration.Apply(c => $"https://{c?.Ingress?.Fqdn}")),
    };
});
