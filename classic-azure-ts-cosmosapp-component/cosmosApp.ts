// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

export interface GlobalContext {
    resourceGroup: azure.core.ResourceGroup;
    cosmosAccount: azure.cosmosdb.Account;
    database: azure.cosmosdb.SqlDatabase;
    container: azure.cosmosdb.SqlContainer;
    opts: pulumi.ResourceOptions;
}

export interface RegionalContext {
    location: string;
}

export interface RegionalEndpoint {
    // Azure resource ID (App Service and Public IP are supported)
    id?: pulumi.Input<string>;
    // An arbitrary URL for other resource types
    url?: pulumi.Input<string>;
}

type BuildLocation = (context: RegionalContext) => RegionalEndpoint;
type BuildLocationFactory = (context: GlobalContext) => BuildLocation;

export interface CosmosAppArgs {
    resourceGroup: azure.core.ResourceGroup;
    locations: pulumi.Input<pulumi.Input<string>[]>;
    databaseName: pulumi.Input<string>;
    containerName: pulumi.Input<string>;
    factory: BuildLocationFactory;
    enableMultiMaster?: boolean;
}

export class CosmosApp extends pulumi.ComponentResource {
    public endpoint: pulumi.Output<string>;

    constructor(name: string,
                args: CosmosAppArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:azure:CosmosApp", name, args, opts);

        const resourceGroup = args.resourceGroup;
        const locations = pulumi.output(args.locations);
        const primaryLocation = locations[0];
        const parentOpts = { parent: this, ...opts };

        // Cosmos DB Account with multiple replicas
        const cosmosAccount = new azure.cosmosdb.Account(`cosmos-${name}`, {
            resourceGroupName: resourceGroup.name,
            location: primaryLocation,
            geoLocations: locations.apply(ls => ls.map((location, failoverPriority) => ({ location, failoverPriority }))),
            offerType: "Standard",
            consistencyPolicy: {
                consistencyLevel: "Session",
                maxIntervalInSeconds: 300,
                maxStalenessPrefix: 100000,
            },
            enableMultipleWriteLocations: args.enableMultiMaster,
        }, parentOpts);

        const database = new azure.cosmosdb.SqlDatabase(`db-${name}`, {
            resourceGroupName: resourceGroup.name,
            accountName: cosmosAccount.name,
            name: args.databaseName,
        }, { parent: cosmosAccount, ...opts });

        const container = new azure.cosmosdb.SqlContainer(`sql-${name}`, {
            resourceGroupName: resourceGroup.name,
            accountName: cosmosAccount.name,
            databaseName: database.name,
        }, { parent: cosmosAccount, ...opts });

        // Traffic Manager as a global HTTP endpoint
        const profile = new azure.network.TrafficManagerProfile(`tm${name}`, {
            resourceGroupName: resourceGroup.name,
            trafficRoutingMethod: "Performance",
            dnsConfig: {
                // Subdomain must be globally unique, so we default it with the full resource group name
                relativeName: pulumi.interpolate`${name}${resourceGroup.name}`,
                ttl: 60,
            },
            monitorConfig: {
                protocol: "HTTP",
                port: 80,
                path: "/api/ping",
            },
        }, parentOpts);

        const buildLocation = args.factory({ resourceGroup, cosmosAccount, database, container, opts: parentOpts });

        const endpoints = locations.apply(ls => ls.map(location => {
            const app = buildLocation({ location });

            // An endpoint per region for Traffic Manager, link to the corresponding instance
            return new azure.network.TrafficManagerEndpoint(`tm${name}${location}`.substring(0, 16), {
                resourceGroupName: resourceGroup.name,
                profileName: profile.name,
                type: app.id ? "azureEndpoints" : "externalEndpoints",
                targetResourceId: app.id,
                target: app.url,
                endpointLocation: location,
            }, { parent: profile, deleteBeforeReplace: true, ...opts });
        }));

        this.endpoint = endpoints.apply(_ => pulumi.interpolate`http://${profile.fqdn}`);

        this.registerOutputs();
    }
}
