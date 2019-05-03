import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { Container } from "@azure/cosmos";
import { getContainer } from "./cosmosclient";

const config = new pulumi.Config();
// Read a list of target locations from the config file:
// Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
const locations = config.require("locations").split(',');
// The first location is considered primary
const primaryLocation = locations[0];

let resourceGroup = new azure.core.ResourceGroup("UrlShorterner", {
    location: primaryLocation,
});

// Cosmos DB with a single write region (primary location) and multiple read replicas
let cosmosdb = new azure.cosmosdb.Account("UrlStore", {
    resourceGroupName: resourceGroup.name,
    location: primaryLocation,
    geoLocations: locations.map((location, failoverPriority) => ({ location, failoverPriority })),
    offerType: "Standard",
    consistencyPolicy: {
        consistencyLevel: "Session",
        maxIntervalInSeconds: 5,
        maxStalenessPrefix: 100,
    },
});

// Traffic Manager as a global HTTP endpoint
const profile = new azure.trafficmanager.Profile("UrlShortEndpoint", {
    resourceGroupName: resourceGroup.name,
    trafficRoutingMethod: 'Performance',
    dnsConfigs: [{
        // Subdomain must be globally unique, so we default it with the full resource group name
        relativeName: resourceGroup.name,
        ttl: 60,
    }],
    monitorConfigs: [{
        protocol: 'HTTP',
        port: 80,
        path: '/api/ping',
    }]
});

// Azure Function to accept new URL shortcodes and save to Cosmos DB
const fn = new azure.appservice.HttpEventSubscription("AddUrl", {
    resourceGroup,
    location: primaryLocation,
    methods: ["POST"],
    callbackFactory: () => {
        const endpoint = cosmosdb.endpoint.get();
        const masterKey = cosmosdb.primaryMasterKey.get();

        let container: Container;
        return async (_, request: azure.appservice.HttpRequest) => {
            container = container || await getContainer(endpoint, masterKey, primaryLocation);

            await container.items.create(request.body);
            return { status: 200, body: 'Short URL saved' };
        };
    }
});
export const addEndpoint = fn.url;

for (const location of locations) {

    // URL redirection function - one per region
    const fn = new azure.appservice.HttpEventSubscription(`GetUrl-${location}`, {
        resourceGroup,
        location,
        route: "{key}",
        callbackFactory: () => {
            const endpoint = cosmosdb.endpoint.get();
            const masterKey = cosmosdb.primaryMasterKey.get();

            let container: Container;
            return async (_, request: azure.appservice.HttpRequest) => {
                container = container || await getContainer(endpoint, masterKey, location);

                const key = request.params['key'];
                if (key === 'ping') {
                    // Handle traffic manager live pings
                    return { status: 200, body: 'Ping ACK' };
                }

                try {
                    const response = await container.item(key.toString()).read();

                    return response.body && response.body.url
                            // HTTP redirect for known URLs
                            ? { status: 301, headers: { "location": response.body.url }, body: '' }
                            // 404 for malformed documents
                            : { status: 404, body: '' };
                } catch (e) {
                    // Cosmos SDK throws an error for non-existing documents
                    return { status: 404, body: '' }
                }
            };
        }
    });

    const app = fn.functionApp;

    // An endpoint per region for Traffic Manager, link to the corresponding Function App
    new azure.trafficmanager.Endpoint(`tme${location}`, {
        resourceGroupName: resourceGroup.name,
        profileName: profile.name,
        type: 'azureEndpoints',
        targetResourceId: app.id,
        target: app.defaultHostname,
        endpointLocation: app.location,
    });
}

export const endpoint = profile.fqdn.apply(h => {
    return `http://${h}/api/{key}`;
});
