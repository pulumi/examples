// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import { CosmosClient } from "@azure/cosmos";
import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
// Read a list of target locations from the config file:
// Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
const locations = config.require("locations").split(",");
// The first location is considered primary
const primaryLocation = locations[0];

const resourceGroup = new azure.core.ResourceGroup("UrlShorterner", {
    location: primaryLocation,
});

// Cosmos DB with a single write region (primary location) and multiple read replicas
const account = new azure.cosmosdb.Account("UrlStore", {
    resourceGroupName: resourceGroup.name,
    location: primaryLocation,
    geoLocations: locations.map((location, failoverPriority) => ({ location, failoverPriority })),
    offerType: "Standard",
    consistencyPolicy: {
        consistencyLevel: "Session",
        maxIntervalInSeconds: 300,
        maxStalenessPrefix: 100000,
    },
});

// Define a database under the Cosmos DB Account
const database = new azure.cosmosdb.SqlDatabase("Database", {
    resourceGroupName: resourceGroup.name,
    accountName: account.name,
});

// Define a SQL Collection under the Cosmos DB Database
const collection = new azure.cosmosdb.SqlContainer("Urls", {
    resourceGroupName: resourceGroup.name,
    accountName: account.name,
    databaseName: database.name,
});

// Traffic Manager as a global HTTP endpoint
const profile = new azure.network.TrafficManagerProfile("UrlShortEndpoint", {
    resourceGroupName: resourceGroup.name,
    trafficRoutingMethod: "Performance",
    dnsConfig: {
        // Subdomain must be globally unique, so we default it with the full resource group name
        relativeName: resourceGroup.name,
        ttl: 60,
    },
    monitorConfig: {
        protocol: "HTTP",
        port: 80,
        path: "/api/ping",
    },
});

// Azure Function to accept new URL shortcodes and save to Cosmos DB
const fn = new azure.appservice.HttpEventSubscription("AddUrl", {
    resourceGroup,
    location: primaryLocation,
    methods: ["POST"],
    callbackFactory: () => {
        const endpoint = account.endpoint.get();
        const key = account.primaryMasterKey.get();

        const client = new CosmosClient({ endpoint, key, connectionPolicy: { preferredLocations: [primaryLocation] } });
        const container = client.database(database.name.get()).container(collection.name.get());
        return async (_, request: azure.appservice.HttpRequest) => {
            await container.items.create(request.body);
            return { status: 200, body: "Short URL saved" };
        };
    },
});
export const addEndpoint = fn.url;

for (const location of locations) {

    // URL redirection function - one per region
    const fn = new azure.appservice.HttpEventSubscription(`GetUrl-${location}`, {
        resourceGroup,
        location,
        route: "{key}",
        callbackFactory: () => {
            const endpoint = account.endpoint.get();
            const key = account.primaryMasterKey.get();

            const client = new CosmosClient({ endpoint, key, connectionPolicy: { preferredLocations: [location] } });
            const container = client.database(database.name.get()).container(collection.name.get());
            return async (_, request: azure.appservice.HttpRequest) => {
                const key = request.params["key"];
                if (key === "ping") {
                    // Handle traffic manager live pings
                    return { status: 200, body: "Ping ACK" };
                }

                try {
                    const response = await container.item(key, undefined).read();
                    return response.resource && response.resource.url
                            // HTTP redirect for known URLs
                            ? { status: 301, headers: { location: response.resource.url }, body: "" }
                            // 404 for malformed documents
                            : { status: 404, body: "" };
                } catch (e) {
                    // Cosmos SDK throws an error for non-existing documents
                    return { status: 404, body: "" };
                }
            };
        },
    });

    const app = fn.functionApp;

    // An endpoint per region for Traffic Manager, link to the corresponding Function App
    const endpoint = new azure.network.TrafficManagerEndpoint(`tme${location}`, {
        resourceGroupName: resourceGroup.name,
        profileName: profile.name,
        type: "azureEndpoints",
        targetResourceId: app.id,
        target: app.defaultHostname,
        endpointLocation: app.location,
    });
}

export const endpoint = profile.fqdn.apply(h => {
    return `http://${h}/api/`;
});
