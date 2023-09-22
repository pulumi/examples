// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("airflow");
const dbPassword = config.requireSecret("dbPassword");

const vpc = awsx.classic.ec2.Vpc.getDefault();

// Create a basic cluster and autoscaling group
const cluster = new awsx.classic.ecs.Cluster("airflow", { vpc });
const autoScalingGroup = cluster.createAutoScalingGroup("airflow", {
    subnetIds: vpc.publicSubnetIds,
    templateParameters: {
        minSize: 4,
    },
    launchConfigurationArgs: {
        instanceType: "t2.xlarge",
    },
});

const securityGroupIds = cluster.securityGroups.map(g => g.id);

const dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
    subnetIds: vpc.publicSubnetIds,
});

const db = new aws.rds.Instance("postgresdb", {
    engine: "postgres",

    instanceClass: "db.t3.micro",
    allocatedStorage: 20,

    dbSubnetGroupName: dbSubnets.id,
    vpcSecurityGroupIds: securityGroupIds,

    name: "airflow",
    username: "airflow",
    password: dbPassword,

    skipFinalSnapshot: true,
});

const cacheSubnets = new aws.elasticache.SubnetGroup("cachesubnets", {
    subnetIds: vpc.publicSubnetIds,
});

const cacheCluster = new aws.elasticache.Cluster("cachecluster", {
    engine: "redis",

    nodeType: "cache.t2.micro",
    numCacheNodes: 1,

    subnetGroupName: cacheSubnets.id,
    securityGroupIds: securityGroupIds,
});

const hosts = pulumi.all([db.endpoint.apply(e => e.split(":")[0]), cacheCluster.cacheNodes[0].address]);
const environment = hosts.apply(([postgresHost, redisHost]) => [
    { name: "POSTGRES_HOST", value: postgresHost },
    { name: "POSTGRES_PASSWORD", value: dbPassword },
    { name: "REDIS_HOST", value: redisHost },
    { name: "EXECUTOR", value: "Celery" },
]);

const airflowControllerListener = new awsx.classic.lb.ApplicationListener("airflowcontroller", {
    external: true,
    port: 8080,
    protocol: "HTTP",
});

const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

const airflowController = new awsx.classic.ecs.EC2Service("airflowcontroller", {
    cluster,
    desiredCount: 1,
    taskDefinitionArgs: {
        containers: {
            "webserver": {
                image: new awsx.ecr.Image("webserver", { repositoryUrl: repo.url, context: "./airflow-container" }).imageUri,
                portMappings: [airflowControllerListener],
                environment: environment,
                command: [ "webserver" ],
                memory: 128,
            },

            "scheduler": {
                image: new awsx.ecr.Image("scheduler", { repositoryUrl: repo.url, context: "./airflow-container" }).imageUri,
                environment: environment,
                command: [ "scheduler" ],
                memory: 128,
            },
        },
    },
});

const airflowerListener = new awsx.classic.lb.ApplicationListener("airflower", {
    port: 5555,
    external: true,
    protocol: "HTTP",
});

const airflower = new awsx.classic.ecs.EC2Service("airflower", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            // If the container is named "flower", we create environment variables that start
            // with `FLOWER_` and Flower tries and fails to parse them as configuration.
            "notflower": {
                image: new awsx.ecr.Image("notflower", { repositoryUrl: repo.url, context: "./airflow-container" }).imageUri,
                portMappings: [airflowerListener],
                environment: environment,
                command: [ "flower" ],
                memory: 128,
            },
        },
    },
});

const airflowWorkers = new awsx.classic.ecs.EC2Service("airflowworkers", {
    cluster,
    desiredCount: 3,
    taskDefinitionArgs: {
        containers: {
            "worker": {
                image: new awsx.ecr.Image("worker", { repositoryUrl: repo.url, context: "./airflow-container" }).imageUri,
                environment: environment,
                command: [ "worker" ],
                memory: 1024,
            },
        },
    },
});

export let airflowEndpoint = airflowControllerListener.endpoint.hostname;
export let flowerEndpoint = airflowerListener.endpoint.hostname;
