import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awscloud from "@pulumi/cloud-aws";

let config = new pulumi.Config("airflow");
const dbPassword = config.require("dbPassword");

let securityGroupIds = [ awscloud.getCluster()!.securityGroupId! ];

let dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
    subnetIds: awscloud.getNetwork().subnetIds,
});

let db = new aws.rds.Instance("postgresdb", {
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

let cacheSubnets = new aws.elasticache.SubnetGroup("cachesubnets", {
    subnetIds: awscloud.getNetwork().subnetIds,
});

let cacheCluster = new aws.elasticache.Cluster("cachecluster", {
    clusterId: "cache-" + pulumi.getStack(),
    engine: "redis",

    nodeType: "cache.t2.micro",
    numCacheNodes: 1,

    subnetGroupName: cacheSubnets.id,
    securityGroupIds: securityGroupIds,
});

let environment = {
    "POSTGRES_HOST": db.endpoint.apply(e => e.split(":")[0]),
    "POSTGRES_PASSWORD": dbPassword,

    "REDIS_HOST": cacheCluster.cacheNodes.apply(n => n[0].address),

    "EXECUTOR": "Celery",
};

let airflowController = new awscloud.Service("airflowcontroller", {
    containers: {
        "webserver": {
            build: "./airflow-container",
            ports: [{ port: 8080, external: true, protocol: "http" }],
            environment: environment,
            command: [ "webserver" ],
        },

        "scheduler": {
            build: "./airflow-container",
            environment: environment,
            command: [ "scheduler" ],
        },
    },
    replicas: 1,
});

let airflower = new awscloud.Service("airflower", {
    containers: {
        // If the container is named "flower", we create environment variables that start
        // with `FLOWER_` and Flower tries and fails to parse them as configuration.
        "notflower": {
            build: "./airflow-container",
            ports: [{ port: 5555, external: true, protocol: "http" }],
            environment: environment,
            command: [ "flower" ],
        },
    },
});

let airflowWorkers = new awscloud.Service("airflowworkers", {
    containers: {
        "worker": {
            build: "./airflow-container",
            environment: environment,
            command: [ "worker" ],
            memory: 1024,
        },
    },
    replicas: 3,
});

export let airflowEndpoint = airflowController.defaultEndpoint.apply(e => e.hostname);
export let flowerEndpoint = airflower.defaultEndpoint.apply(e => e.hostname);
