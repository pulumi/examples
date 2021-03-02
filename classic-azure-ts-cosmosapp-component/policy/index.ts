// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import { distanceBetweenRegions } from "./distance";

function normalizeName(name: string) {
    return name.replace(" ", "").toLowerCase();
}

const policies = new PolicyPack("cosmos-db", {
    policies: [
        {
            name: "discouraged-eventual-consistency",
            description: "Eventual consistency in Cosmos DB is discouraged.",
            enforcementLevel: "advisory",
            validateResource: validateResourceOfType(azure.cosmosdb.Account, (account, args, reportViolation) => {
                if (account.consistencyPolicy.consistencyLevel === "Eventual") {
                    reportViolation("Eventual consistency policy is not recommended. Use Session instead.");
                }
            }),
        },
        {
            name: "allowed-locations",
            description: "Locations only within Europe.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(azure.cosmosdb.Account, (account, args, reportViolation) => {
                const allowedLocations = ["northeurope", "westeurope", "francesouth", "francecentral", "germanywestcentral", "germanynorth", "switzerlandwest", "switzerlandnorth", "norwaywest", "norwayeast"];
                if (account.geoLocations
                    .some(l => allowedLocations.indexOf(normalizeName(l.location)) < 0)) {
                    reportViolation("Only European regions are allowed.");
                }
            }),
        },
        {
            name: "locations-must-be-at-least-500-km-apart",
            description: "For disaster recovery, we should deploy Cosmos DB accounts to multiple regions that are at least 500 km apart.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(azure.cosmosdb.Account, (account, args, reportViolation) => {
                let max = 0;
                // Iterate throu all pairs of regions and calculate locations.
                for (const regionA of account.geoLocations) {
                    for (const regionB of account.geoLocations) {
                        const distance = distanceBetweenRegions(normalizeName(regionA.location), normalizeName(regionB.location));
                        if (distance > 500) {
                            return;
                        }
                        max = Math.max(max, distance);
                    }
                }

                reportViolation(`Max distance has to be >= 500km but is ${max}km`);
            }),
        },
    ],
});
