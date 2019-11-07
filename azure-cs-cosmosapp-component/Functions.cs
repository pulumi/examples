// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;

using Pulumi;
using Pulumi.Azure.Core;

public static class Functions
{
    public static IDictionary<string, object> Run()
    {
        // Read a list of target locations from the config file:
        // Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
        var locations = new Config().Require("locations").Split(",");

        var resourceGroup = new ResourceGroup("cosmosfunctions-rg", new ResourceGroupArgs { Location = locations[0] });

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
                    Archive = new FileArchive("./app/bin/Debug/netcoreapp2.2/publish"),
                    AppSettings =
                    {
                        { "CosmosDBConnection", connectionString },
                    },
                },
                global.Options);

                return new AzureEndpoint(func.AppId);
            },

        });

        return new Dictionary<string, object>
        {
            { "functionsEndpoint", Output.Format($"{app.Endpoint}/cosmos") }
        };
    }
}