// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Azure.Core;

public static class Functions
{
    public static Output<string> Run()
    {
        // Read a list of target locations from the config file:
        // Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
        var locations = new Config().Require("locations").Split(",");

        var resourceGroup = new ResourceGroup("cosmosfunctions-rg", new ResourceGroupArgs {Location = locations[0]});

        var app = new CosmosApp("functions", new CosmosAppArgs
        {
            ResourceGroup = resourceGroup,
            Locations = locations,
            DatabaseName = "pricedb",
            ContainerName = "prices",
            Factory = global => region =>
            {
                var connectionString = global.CosmosAccount.ConnectionStrings.Apply(cs => cs[0]);
                var func = new ArchiveFunctionApp($"afa-{region.Location}", new ArchiveFunctionAppArgs
                    {
                        ResourceGroupName = resourceGroup.Name,
                        Location = region.Location,
                        Archive = new FileArchive("./app/bin/Debug/net6.0/publish"),
                        AppSettings =
                        {
                            {"CosmosDBConnection", connectionString},
                        },
                    },
                    new ComponentResourceOptions {Parent = global.Options.Parent});

                return new AzureEndpoint(func.AppId);
            },
        });

        return Output.Format($"{app.Endpoint}/cosmos");
    }
}
