import {Config, interpolate} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new Config();
const secondaryRegion = config.require("secondaryRegion");

const globalCluster = new aws.rds.GlobalCluster("global-cluster", {
    globalClusterIdentifier: "my-test-global-cluster",
    engine: "aurora",
    engineVersion: "5.6.10a",
});

const cluster = new aws.rds.Cluster("primary-cluster", {
    globalClusterIdentifier: globalCluster.globalClusterIdentifier,
    engineMode: "global",
    engine: "aurora",
    engineVersion: "5.6.10a",
    masterUsername: "MyMasterUser",
    masterPassword: "MyPassword1234!",
    skipFinalSnapshot: true,
});

const clusterInstance = new aws.rds.ClusterInstance("primary-cluster-instance", {
    engine: "aurora",
    instanceClass: aws.rds.InstanceTypes.R5_Large,
    clusterIdentifier: cluster.clusterIdentifier,
});

let clusterEndpoints = new Map()

// Get the primary cluster endpoint - this is used for writes
// export const primary = clusterInstance.endpoint;
clusterEndpoints.set("primary", clusterInstance.endpoint);

const provider = new aws.Provider(`${secondaryRegion}-provider`, {
    region: secondaryRegion as aws.Region,
});

const secondaryCluster = new aws.rds.Cluster(`${secondaryRegion}-cluster`, {
    globalClusterIdentifier: globalCluster.globalClusterIdentifier,
    engineMode: "global",
    engine: "aurora",
    skipFinalSnapshot: true,
}, {
    provider: provider,
    dependsOn: [provider, cluster],
});

const secondaryClusterInstance = new aws.rds.ClusterInstance(`${secondaryRegion}-cluster-instance`, {
    engine: "aurora",
    instanceClass: aws.rds.InstanceTypes.R5_Large,
    clusterIdentifier: secondaryCluster.clusterIdentifier,
}, {
    provider: provider,
    dependsOn: [secondaryCluster],
});

// Get the secondary cluster endpoint
// export const secondary =  secondaryClusterInstance.endpoint;
clusterEndpoints.set(`secondary-${secondaryRegion}`, secondaryClusterInstance.endpoint);

for (let entry of clusterEndpoints.entries()) {
    exports[entry[0]] = entry[1]
}


