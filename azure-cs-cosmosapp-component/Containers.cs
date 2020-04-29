// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.ContainerService;
using Pulumi.Azure.ContainerService.Inputs;
using Pulumi.Azure.Core;
using Pulumi.Docker;

public static class Containers
{
    public static Output<string> Run()
    {
        // Read a list of target locations from the config file:
        // Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
        var locations = new Pulumi.Config().Require("locations").Split(",");

        var resourceGroup = new ResourceGroup("cosmosaci-rg", new ResourceGroupArgs {Location = locations[0]});

        var app = new CosmosApp("aci", new CosmosAppArgs
        {
            ResourceGroup = resourceGroup,
            Locations = locations,
            DatabaseName = "pricedb",
            ContainerName = "prices",
            Factory = global =>
            {
                var registry = new Registry("global", new RegistryArgs
                {
                    ResourceGroupName = resourceGroup.Name,
                    AdminEnabled = true,
                    Sku = "Premium",
                }, global.Options);

                var dockerImage = new Image("node-app", new ImageArgs
                {
                    ImageName = Output.Format($"{registry.LoginServer}/mynodeapp:v1.0.0"),
                    Build = "./container",
                    Registry = new ImageRegistry
                    {
                        Server = registry.LoginServer,
                        Username = registry.AdminUsername,
                        Password = registry.AdminPassword,
                    },
                }, new ComponentResourceOptions {Parent = registry});

                return region =>
                {
                    var connectionString = global.CosmosAccount.ConnectionStrings.Apply(cs => cs[0]);
                    var group = new Group($"aci-{region.Location}", new GroupArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = region.Location,
                        ImageRegistryCredentials =
                        {
                            new GroupImageRegistryCredentialArgs
                            {
                                Server = registry.LoginServer,
                                Username = registry.AdminUsername,
                                Password = registry.AdminPassword,
                            }
                        },
                        OsType = "Linux",
                        Containers =
                        {
                            new GroupContainerArgs
                            {
                                Cpu = 0.5,
                                Image = dockerImage.ImageName,
                                Memory = 1.5,
                                Name = "hello-world",
                                Ports =
                                {
                                    new GroupContainerPortArgs
                                    {
                                        Port = 80,
                                        Protocol = "TCP",
                                    }
                                },
                                EnvironmentVariables =
                                {
                                    {"ENDPOINT", global.CosmosAccount.Endpoint},
                                    {"MASTER_KEY", global.CosmosAccount.PrimaryMasterKey},
                                    {"DATABASE", global.Database.Name},
                                    {"COLLECTION", global.Container.Name},
                                    {"LOCATION", region.Location},
                                },
                            },
                        },
                        IpAddressType = "public",
                        DnsNameLabel = $"acishop-{region.Location}",
                    }, global.Options);

                    return new ExternalEndpoint(group.Fqdn);
                };
            }
        });

        return Output.Format($"{app.Endpoint}/cosmos");
    }
}
