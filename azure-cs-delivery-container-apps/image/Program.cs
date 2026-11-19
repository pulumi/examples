// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using Pulumi;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using ResourceGroup = Pulumi.AzureNative.Resources.ResourceGroup;
using DockerBuild = Pulumi.DockerBuild;

return await Deployment.RunAsync(() =>
{
    var config = new Config();

    // Set by the pipeline: the commit being built.
    var commit = config.Require("commit");

    var resourceGroup = new ResourceGroup("rg");

    // The admin user lets the push below, and the Container App in the beta
    // stack, authenticate with a username and password.
    var registry = new Registry("registry", new RegistryArgs
    {
        ResourceGroupName = resourceGroup.Name,
        Sku = new SkuArgs { Name = SkuName.Basic },
        AdminUserEnabled = true,
    });

    var credentials = ListRegistryCredentials.Invoke(new ListRegistryCredentialsInvokeArgs
    {
        ResourceGroupName = resourceGroup.Name,
        RegistryName = registry.Name,
    });

    var image = new DockerBuild.Image("app", new DockerBuild.ImageArgs
    {
        Context = new DockerBuild.Inputs.BuildContextArgs { Location = "../app" },
        Platforms = { DockerBuild.Platform.Linux_amd64 },
        Tags = { Output.Format($"{registry.LoginServer}/app:{commit}") },
        Push = true,
        Registries =
        {
            new DockerBuild.Inputs.RegistryArgs
            {
                Address = registry.LoginServer,
                Username = credentials.Apply(c => c.Username!),
                Password = Output.CreateSecret(credentials.Apply(c => c.Passwords[0].Value!)),
            },
        },
    });

    return new Dictionary<string, object?>
    {
        // The pushed image, pinned by digest. Later stages deploy this exact image.
        ["imageRef"] = image.Ref,
        // Plain names, so the beta stack can look the registry credentials up
        // itself. Delivery config does not carry secrets.
        ["registryName"] = registry.Name,
        ["resourceGroupName"] = resourceGroup.Name,
    };
});
