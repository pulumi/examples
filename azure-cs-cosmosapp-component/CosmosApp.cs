// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Immutable;
using System.Linq;

using Pulumi;
using Pulumi.Azure.Core;
using Pulumi.Azure.CosmosDB;
using Pulumi.Azure.CosmosDB.Inputs;
using Pulumi.Azure.Network;
using Pulumi.Azure.Network.Inputs;

public class GlobalContext
{
    public ResourceGroup ResourceGroup { get; }
    public Account CosmosAccount { get; }
    public SqlDatabase Database { get; }
    public SqlContainer Container { get; }
    public CustomResourceOptions Options { get; }

    internal GlobalContext(ResourceGroup resourceGroup, Account cosmosAccount, SqlDatabase database, SqlContainer container, CustomResourceOptions options)
    {
        this.ResourceGroup = resourceGroup;
        this.CosmosAccount = cosmosAccount;
        this.Database = database;
        this.Container = container;
        this.Options = options;
    }
}

public class RegionalContext
{
    public string Location { get; }

    internal RegionalContext(string location)
    {
        this.Location = location;
    }
}

public interface IRegionalEndpoint
{
    // Type of the endpoint
    Input<string> Type { get; }
    // Azure resource ID (App Service and Public IP are supported)
    Input<string>? Id { get; }
    // An arbitrary URL for other resource types
    Input<string>? Url { get; }
}

public class AzureEndpoint : IRegionalEndpoint
{
    public Input<string> Type => "azureEndpoints";

    public Input<string> Id { get; }

    public Input<string>? Url => null;

    public AzureEndpoint(Input<string> id)
    {
        this.Id = id;
    }
}

public class ExternalEndpoint : IRegionalEndpoint
{
    public Input<string> Type => "externalEndpoints";

    public Input<string>? Id => null;

    public Input<string> Url { get;  }

    public ExternalEndpoint(Input<string> url)
    {
        this.Url = url;
    }
}

public class CosmosAppArgs
{
    public ResourceGroup ResourceGroup { get; set; } = null!;
    public string[] Locations { get; set; } = null!;
    public Func<GlobalContext, Func<RegionalContext, IRegionalEndpoint>> Factory { get; set; } = null!;
    public Input<string> DatabaseName { get; set; } = null!;
    public Input<string> ContainerName { get; set; } = null!;
    public Input<bool>? EnableMultiMaster { get; set; }
}

public class CosmosApp : ComponentResource
{
    public Output<string> Endpoint { get; private set; } = null!;

    public CosmosApp(string name, CosmosAppArgs args, ComponentResourceOptions? options = null)
        : base("examples:azure:CosmosApp", name, options)
    {
        var resourceGroup = args.ResourceGroup;
        var locations = args.Locations;
        var primaryLocation = locations[0];
        var parentOptions = new CustomResourceOptions { Parent = this };

        // Cosmos DB Account with multiple replicas
        var cosmosAccount = new Account($"cosmos-{name}",
            new AccountArgs
            {
                ResourceGroupName = resourceGroup.Name,
                Location = primaryLocation,
                GeoLocations = locations.Select((l, i) => new AccountGeoLocationArgs { Location = l, FailoverPriority = i }).ToArray(),
                OfferType = "Standard",
                ConsistencyPolicy = new AccountConsistencyPolicyArgs { ConsistencyLevel = "Session" },
                EnableMultipleWriteLocations = args.EnableMultiMaster,
            },
            parentOptions);

        var database = new SqlDatabase($"db-{name}",
            new SqlDatabaseArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AccountName = cosmosAccount.Name,
                Name = args.DatabaseName,
            },
            parentOptions);

        var container = new SqlContainer($"sql-{name}",
            new SqlContainerArgs
            {
                ResourceGroupName = resourceGroup.Name,
                AccountName = cosmosAccount.Name,
                DatabaseName = database.Name,
                Name = args.ContainerName,
            },
            parentOptions);

        // Traffic Manager as a global HTTP endpoint
        var profile = new TrafficManagerProfile($"tm{name}",
            new TrafficManagerProfileArgs
            {
                ResourceGroupName = resourceGroup.Name,
                TrafficRoutingMethod = "Performance",
                DnsConfig = new TrafficManagerProfileDnsConfigArgs
                {
                    // Subdomain must be globally unique, so we default it with the full resource group name
                    RelativeName = Output.Format($"{name}{resourceGroup.Name}"),
                    Ttl = 60,
                },
                MonitorConfig = new TrafficManagerProfileMonitorConfigArgs
                {
                    Protocol = "HTTP",
                    Port = 80,
                    Path = "/api/ping",
                }
            },
            parentOptions);

        var globalContext = new GlobalContext(resourceGroup, cosmosAccount, database, container, parentOptions);
        var buildLocation = args.Factory(globalContext);
        var endpointOptions = new CustomResourceOptions { Parent = profile, DeleteBeforeReplace = true };

        var endpoints = locations.Select(location =>
        {
            var app = buildLocation(new RegionalContext(location));

            return new TrafficManagerEndpoint($"tm{name}{location}".Truncate(16),
                new TrafficManagerEndpointArgs
                {
                    ResourceGroupName = resourceGroup.Name,
                    ProfileName = profile.Name,
                    Type = app.Type,
                    TargetResourceId = app.Id,
                    Target = app.Url,
                    EndpointLocation = location,
                },
                endpointOptions);
        }).ToList();

        this.Endpoint = Output.Format($"http://{profile.Fqdn}");
        this.RegisterOutputs();
    }
}
