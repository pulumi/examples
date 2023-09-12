// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as k8s from "@pulumi/kubernetes";
import * as config from "./config";
import * as mongoHelpers from "./mongoHelpers";

// Create an AKS cluster.
import { k8sCluster, k8sProvider } from "./cluster";

// Create a MongoDB-flavored instance of CosmosDB.
const cosmosdb = new azure.cosmosdb.Account("cosmosDb", {
    kind: "MongoDB",
    resourceGroupName: config.resourceGroup.name,
    consistencyPolicy: {
        consistencyLevel: "BoundedStaleness",
        maxIntervalInSeconds: 300,
        maxStalenessPrefix: 100000,
    },
    offerType: "Standard",
    enableAutomaticFailover: true,
    geoLocations: [
        { location: config.location, failoverPriority: 0 },
        { location: config.failoverLocation, failoverPriority: 1 },
    ],
});

// Create secret from MongoDB connection string.
const mongoConnStrings = new k8s.core.v1.Secret(
    "mongo-secrets",
    {
        metadata: { name: "mongo-secrets" },
        data: mongoHelpers.parseConnString(cosmosdb.connectionStrings),
    },
    { provider: k8sProvider },
);

// Boot up Node.js Helm chart example using CosmosDB in place of in-cluster MongoDB.
const node = new k8s.helm.v3.Chart(
    "node",
    {
        chart: "node",
        version: "19.0.2",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
        values: {
            serviceType: "LoadBalancer",
            mongodb: { install: false },
            externaldb: { ssl: true, secretName: "mongo-secrets" },
        },
    },
    { providers: { kubernetes: k8sProvider }, dependsOn: mongoConnStrings },
);

// Export kubeconfig file, cluster name, and public IP address for Kubernetes application. These can
// be accessed from the CLI, like: `pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml`.
export const kubeconfig = k8sCluster.kubeConfigRaw;
export const cluster = k8sCluster.name;
