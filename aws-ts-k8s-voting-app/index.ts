// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as postgresql from "@pulumi/postgresql";
import * as pulumi from "@pulumi/pulumi";
import { Schema } from "./postgresql_dynamic_provider";

const config = new pulumi.Config();
const sqlAdminName = config.require("sql-admin-name");
const sqlAdminPassword = config.requireSecret("sql-admin-password");
const sqlUserName = config.require("sql-user-name");
const sqlUserPassword = config.requireSecret("sql-user-password");
const awsConfig = new pulumi.Config("aws");
const region = aws.config.region;

// Creating an EKS cluster
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

const ebsVolume = new aws.ebs.Volume("storage-volume", {
    size: 10,
    type: "gp2",
    availabilityZone: region + "a",
    encrypted: true,
    }, {
    protect: false,
});

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
                    image: awsx.ecr.buildAndPushImage("database-side-service", "./databaseside").image(),
                    ports: [{ name: "http", containerPort: 5432 }],
                    env: [
                        { name: "ADMIN_NAME", value: sqlAdminName },
                        { name: "ADMIN_PASSWORD", value: sqlAdminPassword },
                    ],
                    volumeMounts: [{
                        name: "persistent-volume",
                        mountPath: "/persistentVolume"
                    }],
                    resources: {
                        limits: {
                            memory: "1Gi",
                            cpu: "1000m" 
                        }
                    }
                }],
                volumes: [{
                    name: "persistent-volume",
                    awsElasticBlockStore: {
                        volumeID: ebsVolume.id,
                    },
                }],
                affinity: {  // We configure database pods to only launch in the same zone as the EBS volume
                    nodeAffinity: {
                        requiredDuringSchedulingIgnoredDuringExecution: {
                            nodeSelectorTerms: [{
                                matchExpressions: [{
                                    key: "failure-domain.beta.kubernetes.io/zone",
                                    operator: "In",
                                    values: [ebsVolume.availabilityZone],
                                }]
                            }]
                        }
                    }
                }
            }
        },
        strategy: {
            type: "Recreate" // Kubernetes is configured to delete before replace to avoid a deadlock between the old and new pods both trying to attach to one volume
        } 
    }}, {
    deleteBeforeReplace: true,  // Pulumi is configured to delete before replace to avoid a deadlock between the old and new pods both trying to attach to one volume
    provider: eksCluster.provider,
});

const databasesideListener = new k8s.core.v1.Service("database-side-listener", {
    metadata: { labels: databaseDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 5432, targetPort: "http" }],
        selector: databaseAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    }
);

const postgresqlAddress = databasesideListener.status.loadBalancer.ingress[0].hostname;

const postgresqlProvider = new postgresql.Provider("postgresql-provider", {
        host: postgresqlAddress,
        port: 5432,
        username: sqlAdminName,
        password: sqlAdminPassword,
        superuser: false,
        sslmode: "disable",
});

const postgresDatabase = new postgresql.Database("postgresql-database", {
    name: "votes"}, {
    provider: postgresqlProvider,
});

const postgresUser = new postgresql.Role("postgres-standard-role", {
    name: sqlUserName,
    password: sqlUserPassword,
    superuser: false,
    login: true,
    connectionLimit: -1}, {
    provider: postgresqlProvider,
});

// The database schema and initial data to be deployed to the database
const creationScript = `
    CREATE SCHEMA voting_app;
    CREATE TABLE voting_app.choice(
        choice_id SERIAL PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        vote_count INTEGER NOT NULL
    );
    GRANT USAGE ON SCHEMA voting_app TO ${sqlUserName};
    GRANT SELECT, UPDATE ON ALL TABLES IN SCHEMA voting_app TO ${sqlUserName};
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Tabs', 0);
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Spaces', 0);
`;

// The SQL commands the database performs when deleting the schema
const deletionScript = "DROP SCHEMA IF EXISTS voting_app CASCADE";

// Creating our dynamic resource to deploy the schema during `pulumi up`. The arguments
// are passed in as a SchemaInputs object
const postgresqlVotesSchema = new Schema("postgresql-votes-schema", {
    creatorName: sqlAdminName,
    creatorPassword: sqlAdminPassword,
    serverAddress: postgresqlAddress,
    databaseName: postgresDatabase.name,
    creationScript: creationScript,
    deletionScript: deletionScript,
    postgresUserName: postgresUser.name,
});

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
                    image: awsx.ecr.buildAndPushImage("server-side-service", "./serverside").image(),
                    ports: [{ name: "http", containerPort: 5000 }],
                    env: [
                        { name: "USER_NAME", value: sqlUserName },
                        { name: "USER_PASSWORD", value: sqlUserPassword },
                        { name: "POSTGRES_ADDRESS", value: postgresqlAddress },
                        { name: "POSTGRES_PORT", value: String(5432) },
                        { name: "DATABASE_NAME", value: postgresDatabase.name },
                    ],
                    resources: {
                        limits: {
                            memory: "500Mi",
                            cpu: "500m" 
                        }
                    }
                }],
            }
        }
    }}, {
    provider: eksCluster.provider,
});

const serversideListener = new k8s.core.v1.Service("server-side-listener", {
    metadata: { labels: serverDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 5000, targetPort: "http" }],
        selector: serverAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    }
);

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
                    image: awsx.ecr.buildAndPushImage("client-side-service", "./clientside").image(),
                    ports: [{ name: "http", containerPort: 3000 }],
                    env: [
                        { name: "SERVER_HOSTNAME", value: serversideListener.status.loadBalancer.ingress[0].hostname },
                    ],
                    resources: {
                        limits: {
                            memory: "500Mi",
                            cpu: "500m" 
                        }
                    },
                }],
            }
        }
    }}, {
    provider: eksCluster.provider,
});

const clientsideListener = new k8s.core.v1.Service("client-side-listener", {
    metadata: { labels: clientDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 3000, targetPort: "http" }],
        selector: clientAppLabels,
        publishNotReadyAddresses: false,
    }}, {
    provider: eksCluster.provider,
    }
);

export const kubeConfig = eksCluster.kubeconfig;
export const URL = clientsideListener.status.loadBalancer.ingress[0].hostname;
