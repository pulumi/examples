// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { CosmosApp, GlobalContext, RegionalContext } from "./cosmosApp";

// Read a list of target locations from the config file:
// Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
const locations = new pulumi.Config().require("locations").split(",");

const resourceGroup = new azure.core.ResourceGroup("cosmosaci-rg", {
    location: locations[0],
});

function buildContainerApp({ cosmosAccount, database, container, opts }: GlobalContext) {

    const registry = new azure.containerservice.Registry("global", {
        resourceGroupName: resourceGroup.name,
        adminEnabled: true,
        sku: "Premium",
    }, opts);

    const dockerImage = new docker.Image("node-app", {
        imageName: pulumi.interpolate`${registry.loginServer}/mynodeapp:v1.0.0`,
        build: {
            context: "./container",
        },
        registry: {
            server: registry.loginServer,
            username: registry.adminUsername,
            password: registry.adminPassword,
        },
    }, opts);

    return ({ location }: RegionalContext) => {
        const group = new azure.containerservice.Group(`aci-${location}`, {
            resourceGroupName: resourceGroup.name,
            location,
            imageRegistryCredentials: [{
                server: registry.loginServer,
                username: registry.adminUsername,
                password: registry.adminPassword,
            }],
            osType: "Linux",
            containers: [
                {
                    cpu: 0.5,
                    image: dockerImage.imageName,
                    memory: 1.5,
                    name: "hello-world",
                    ports: [{
                        port: 80,
                        protocol: "TCP",
                    }],
                    environmentVariables: {
                        ENDPOINT: cosmosAccount.endpoint,
                        MASTER_KEY: cosmosAccount.primaryMasterKey,
                        DATABASE: database.name,
                        COLLECTION: container.name,
                        LOCATION: location,
                    },
                },
            ],
            ipAddressType: "public",
            dnsNameLabel: `acishop-${location}`,
        }, { deleteBeforeReplace: true, ...opts });

        return {
            url: group.fqdn,
        };
    };
}

export const aci = new CosmosApp("aci", {
    resourceGroup,
    locations,
    databaseName: "cartdb",
    containerName: "items",
    factory: buildContainerApp,
    enableMultiMaster: true,
});
