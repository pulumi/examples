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
        maxIntervalInSeconds: 10,
        maxStalenessPrefix: 200,
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

// Boot up nodejs Helm chart example using CosmosDB in place of in-cluster MongoDB.
const node = new k8s.helm.v2.Chart(
    "node",
    {
        repo: "bitnami",
        chart: "node",
        version: "4.0.1",
        values: {
            serviceType: "LoadBalancer",
            mongodb: { install: false },
            externaldb: { ssl: true, secretName: "mongo-secrets" },
        },
    },
    { providers: { kubernetes: k8sProvider }, dependsOn: mongoConnStrings },
);

// Export kubeconfig file, cluster name, and public IP address for Kubernetes application. These can
// be accessed from the CLI, like: `pulumi stack output kubeconfig > kubeconfig.yaml`.
export const kubeconfig = k8sCluster.kubeConfigRaw;
export const cluster = k8sCluster.name;
export const frontendAddress = node
    .getResourceProperty("v1/Service", "node-node", "status")
    .apply(status => status.loadBalancer.ingress[0].ip);
