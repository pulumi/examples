// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import "mocha";

let cosmosdbAccountLocation: string;

pulumi.runtime.setMocks({
    newResource: function(type: string, name: string, inputs: any): {id: string, state: any} {
        if (type === "azure:cosmosdb/account:Account") {
            cosmosdbAccountLocation = inputs.location;
        }

        switch (type) {
            default:
                return {
                    id: inputs.name + "_id",
                    state: {
                        ...inputs,
                    },
                };
        }
    },
    call: function(token: string, args: any, provider?: string) {
        return args;
    },
});

// It's important to import the program _after_ the mocks are defined.
import * as components from "./cosmosApp";

describe("Cosmos App component", function() {
    const resourceGroup = new azure.core.ResourceGroup("unittest-rg");

    describe("Locations", function() {

        // check 1: A callback is invoked for every location.
        it("callback is invoked for every location", function(done) {
            const appRegions = [];

            function buildApp(_: components.GlobalContext) {
                return ({ location }: components.RegionalContext) => {
                    appRegions.push(location);
                    return {
                        id: "id_" + location,
                    };
                };
            }

            const app = new components.CosmosApp("unittest-app", {
                resourceGroup,
                locations: ["WestUS", "WestEurope"],
                databaseName: "productsdb",
                containerName: "products",
                factory: buildApp,
            });

            app.endpoint.apply(_ => {
                if (appRegions.length === 2) {
                    done();
                } else {
                    done(new Error(`Wrong number of regions: expected 2 got ${appRegions.length}`));
                }
            });
        });

        // check 2: The first location from the list is applied as the primary region of Cosmos DB.
        it("primary location is set to the first region", function(done) {
            function buildApp(_: components.GlobalContext) {
                return ({ location }: components.RegionalContext) => {
                    return {
                        id: "id_" + location,
                    };
                };
            }

            const app = new components.CosmosApp("unittest-app", {
                resourceGroup,
                locations: ["WestUS", "WestEurope"],
                databaseName: "productsdb",
                containerName: "products",
                factory: buildApp,
            });

            app.endpoint.apply(_ => {
                if (cosmosdbAccountLocation === "WestUS") {
                    done();
                } else {
                    done(new Error(`Wrong location: expected WestUS got ${cosmosdbAccountLocation}`));
                }
            });
        });
    });
});
