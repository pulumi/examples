// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("airflow");
const dbPassword = config.require("dbPassword");

const vpc = awsx.ec2.Vpc.getDefault();

// Create a basic cluster and autoscaling group
const cluster = new awsx.ecs.Cluster("airflow", { vpc });
const autoScalingGroup = cluster.createAutoScalingGroup("airflow", {
    subnetIds: vpc.publicSubnetIds,
    templateParameters: {
        minSize: 20,
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

    instanceClass: "db.t2.micro",
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

const airflowControllerListener = new awsx.elasticloadbalancingv2.ApplicationListener("airflowcontroller", {
    external: true,
    port: 8080,
    protocol: "HTTP",
});

const airflowController = new awsx.ecs.EC2Service("airflowcontroller", {
    cluster,
    desiredCount: 1,
    taskDefinitionArgs: {
        containers: {
            "webserver": {
                image: awsx.ecs.Image.fromPath("webserver", "./airflow-container"),
                portMappings: [airflowControllerListener],
                environment: environment,
                command: [ "webserver" ],
                memory: 128,
            },

            "scheduler": {
                image: awsx.ecs.Image.fromPath("scheduler", "./airflow-container"),
                environment: environment,
                command: [ "scheduler" ],
                memory: 128,
            },
        },
    },
});

const airflowerListener = new awsx.elasticloadbalancingv2.ApplicationListener("airflower", {
    port: 5555,
    external: true,
    protocol: "HTTP",
});

const airflower = new awsx.ecs.EC2Service("airflower", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            // If the container is named "flower", we create environment variables that start
            // with `FLOWER_` and Flower tries and fails to parse them as configuration.
            "notflower": {
                image: awsx.ecs.Image.fromPath("notflower", "./airflow-container"),
                portMappings: [airflowerListener],
                environment: environment,
                command: [ "flower" ],
                memory: 128,
            },
        },
    },
});

const airflowWorkers = new awsx.ecs.EC2Service("airflowworkers", {
    cluster,
    desiredCount: 3,
    taskDefinitionArgs: {
        containers: {
            "worker": {
                image: awsx.ecs.Image.fromPath("worker", "./airflow-container"),
                environment: environment,
                command: [ "worker" ],
                memory: 1024,
            },
        },
    },
});

export let airflowEndpoint = airflowControllerListener.endpoint.hostname;
export let flowerEndpoint = airflowerListener.endpoint.hostname;
