// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Getting necessary settings from the Pulumi config
const config = new pulumi.Config();
const sqlAdminName = config.require("sql-admin-name");
const sqlAdminPassword = config.requireSecret("sql-admin-password");
const sqlUserName = config.require("sql-user-name");
const sqlUserPassword = config.requireSecret("sql-user-password");
const awsConfig = new pulumi.Config("aws");
const region = aws.config.region;

// Creating an EKS cluster in which our project will run
const eksCluster = new eks.Cluster("eksCluster", {
    name: "eksCluster",
    instanceType: "t2.medium",
    desiredCapacity: 3,
    minSize: 2,
    maxSize: 4,
    deployDashboard: false,
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
});

// To prevent information in the PostgreSQL database from being lost in the case of a shutdown or reset,
// everything will be stored inside an Elastic Block Store volume
const ebsVolume = new aws.ebs.Volume("storage-volume", {
    size: 1,
    type: "gp2",
    availabilityZone: region + "a",
    encrypted: true,
    }, {
    protect: false,
});

const databaseName = "votes";

const repo = new awsx.ecr.Repository("repository");

// Creating a Kubernetes deployment for the PostgreSQL database. A single pod will receive queries, and will
// modify the data accordingly
const dbImage = new awsx.ecr.Image("database-side-service", { repositoryUrl: repo.repository.repositoryUrl, context: "./databaseside" });
const databaseAppName = "database-side-service";
const databaseAppLabels = { appClass: databaseAppName };
const databaseDeployment = new k8s.apps.v1.Deployment(databaseAppName, {
    metadata: { name: databaseAppName, labels: databaseAppLabels },
    spec: {
        replicas: 1,
        selector: { matchLabels: databaseAppLabels },
        template: {
            metadata: { labels: databaseAppLabels },
            spec: {
                containers: [{
                    name: databaseAppName,
                    image: dbImage.imageUri,
                    ports: [{ name: "http", containerPort: 5432 }],
                    env: [
                        { name: "DATABASE_NAME", value: databaseName },
                        { name: "ADMIN_NAME", value: sqlAdminName },
                        { name: "ADMIN_PASSWORD", value: sqlAdminPassword },
                        { name: "USER_NAME", value: sqlUserName },
                        { name: "USER_PASSWORD", value: sqlUserPassword },

                    ],
                    volumeMounts: [{  // The EBS volume is mounted to the pod, allowing the database to permanently store data
                        name: "persistent-volume",
                        mountPath: "/persistentVolume",
                    }],
                    resources: {
                        limits: {
                            memory: "1Gi",
                            cpu: "1000m",
                        },
                    },
                }],
                volumes: [{
                    name: "persistent-volume",
                    awsElasticBlockStore: {
                        volumeID: ebsVolume.id,
                    },
                }],
                affinity: {  // The pod is configured to always launch in the same availability zone as the EBS volume
                    nodeAffinity: {
                        requiredDuringSchedulingIgnoredDuringExecution: {
                            nodeSelectorTerms: [{
                                matchExpressions: [{
                                    key: "failure-domain.beta.kubernetes.io/zone",
                                    operator: "In",
                                    values: [ebsVolume.availabilityZone],
                                }],
                            }],
                        },
                    },
                },
            },
        },
        strategy: {
            type: "Recreate",
        },
    }}, {
    deleteBeforeReplace: true,
    provider: eksCluster.provider,
});

// A Kubernetes service is created for the database using an internal IP address. Other components within
// the cluster can now communicate with it
const databasesideListener = new k8s.core.v1.Service("database-side-listener", {
    metadata: { labels: databaseDeployment.metadata.labels },
    spec: {
        type: "ClusterIP",
        ports: [{ port: 5432, targetPort: "http" }],
        selector: databaseAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    },
);

const postgresqlAddress = databasesideListener.spec.clusterIP;

// Creating a deployment for the server which receives requests from the users, and translates them into
// queries for the database. Any number of pods can be created for this deployment
const serverImage = new awsx.ecr.Image("server-side-service", { repositoryUrl: repo.repository.repositoryUrl, context: "./serverside" });
const serverAppName = "server";
const serverAppLabels = { appClass: serverAppName };
const serverDeployment = new k8s.apps.v1.Deployment("server-side-service", {
    metadata: { labels: serverAppLabels },
    spec: {
        replicas: 2,
        selector: { matchLabels: serverAppLabels },
        template: {
            metadata: { labels: serverAppLabels },
            spec: {
                containers: [{
                    name: serverAppName,
                    image: serverImage.imageUri,
                    ports: [{ name: "http", containerPort: 5000 }],
                    env: [
                        { name: "USER_NAME", value: sqlUserName },
                        { name: "USER_PASSWORD", value: sqlUserPassword },
                        { name: "POSTGRES_ADDRESS", value: postgresqlAddress },
                        { name: "POSTGRES_PORT", value: String(5432) },
                        { name: "DATABASE_NAME", value: databaseName },
                    ],
                    resources: {
                        limits: {
                            memory: "500Mi",
                            cpu: "500m",
                        },
                    },
                }],
            },
        },
    }}, {
    provider: eksCluster.provider,
});

// A service is created for the server to open it to the internet. Anyone can send commands to the
// service's Load Balancer, which will autimatically distribute them across the availible pods.
const serversideListener = new k8s.core.v1.Service("server-side-listener", {
    metadata: { labels: serverDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 5000, targetPort: "http" }],
        selector: serverAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    },
);

// The final deployment is created for the client compoment. It acts as the main web page of the
// voting application
const clientImage = new awsx.ecr.Image("client-side-service", { repositoryUrl: repo.repository.repositoryUrl, context: "./clientside" });
const clientAppName = "client";
const clientAppLabels = { appClass: clientAppName };
const clientDeployment = new k8s.apps.v1.Deployment("client-side-service", {
    metadata: { labels: clientAppLabels },
    spec: {
        replicas: 2,
        selector: { matchLabels: clientAppLabels },
        template: {
            metadata: { labels: clientAppLabels },
            spec: {
                containers: [{
                    name: clientAppName,
                    image: clientImage.imageUri,
                    ports: [{ name: "http", containerPort: 3000 }],
                    env: [
                        { name: "SERVER_HOSTNAME", value: serversideListener.status.loadBalancer.ingress[0].hostname },
                    ],
                    resources: {
                        limits: {
                            memory: "500Mi",
                            cpu: "500m",
                        },
                    },
                }],
            },
        },
    }}, {
    provider: eksCluster.provider,
});


// Like with the server, a Load Balancer service is created for the clientside component. Users
// will connect to it using port 3000, and will be balanced across the availible pods
const clientsideListener = new k8s.core.v1.Service("client-side-listener", {
    metadata: { labels: clientDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 3000, targetPort: "http" }],
        selector: clientAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    },
);

// Exporting the KubeConfig of the cluster, and the URL of the clientside listener. We can now
// use the URL to connect to our application
export const kubeConfig = eksCluster.kubeconfig;
export const URL = clientsideListener.status.loadBalancer.ingress[0].hostname;
