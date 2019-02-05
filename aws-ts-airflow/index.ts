import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

let config = new pulumi.Config("airflow");
const dbPassword = config.require("dbPassword");

let vpc = awsx.ec2.Vpc.getDefault();

// Create a basic cluster and autoscaling group
let cluster = new awsx.ecs.Cluster("airflow", { vpc });
let autoScalingGroup = cluster.createAutoScalingGroup("airflow", {
    templateParameters: {
        minSize: 20,
    },
    launchConfigurationArgs: {
        instanceType: "t2.xlarge",
    },
});

let securityGroupIds = cluster.securityGroups.map(g => g.id);

let dbSubnets = new aws.rds.SubnetGroup("dbsubnets", {
    subnetIds: vpc.publicSubnetIds,
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
    subnetIds: vpc.publicSubnetIds,
});

let cacheCluster = new aws.elasticache.Cluster("cachecluster", {
    clusterId: "cache-" + pulumi.getStack(),
    engine: "redis",

    nodeType: "cache.t2.micro",
    numCacheNodes: 1,

    subnetGroupName: cacheSubnets.id,
    securityGroupIds: securityGroupIds,
});

let hosts = pulumi.all([db.endpoint.apply(e => e.split(":")[0]), cacheCluster.cacheNodes.apply(n => n[0].address)]);
let environment = hosts.apply(([postgresHost, redisHost]) => [
    { name: "POSTGRES_HOST", value: postgresHost },
    { name: "POSTGRES_PASSWORD", value: dbPassword },
    { name: "REDIS_HOST", value: redisHost },
    { name: "EXECUTOR", value: "Celery" }
]);

let airflowControllerListener = new awsx.elasticloadbalancingv2.ApplicationListener("airflowcontroller", {
    external: true,
    port: 8080,
    protocol: "HTTP",
});

let airflowController = new awsx.ecs.EC2Service("airflowcontroller", {
    cluster,
    desiredCount: 1,
    taskDefinitionArgs: {
        containers: {
            "webserver": {
                image: awsx.ecs.Image.fromPath("./airflow-container"),
                portMappings: [airflowControllerListener],
                environment: environment,
                command: [ "webserver" ],
                memory: 128,
            },

            "scheduler": {
                image: awsx.ecs.Image.fromPath("./airflow-container"),
                environment: environment,
                command: [ "scheduler" ],
                memory: 128,
            },
        },
    },
});

let airflowerListener = new awsx.elasticloadbalancingv2.ApplicationListener("airflower", {
    port: 5555,
    external: true,
    protocol: "HTTP"
});

let airflower = new awsx.ecs.EC2Service("airflower", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            // If the container is named "flower", we create environment variables that start
            // with `FLOWER_` and Flower tries and fails to parse them as configuration.
            "notflower": {
                image: awsx.ecs.Image.fromPath("./airflow-container"),
                portMappings: [airflowerListener],
                environment: environment,
                command: [ "flower" ],
                memory: 128,
            },
        },
    },
});

let airflowWorkers = new awsx.ecs.EC2Service("airflowworkers", {
    cluster,
    desiredCount: 3,
    taskDefinitionArgs: {
        containers: {
            "worker": {
                image: awsx.ecs.Image.fromPath("./airflow-container"),
                environment: environment,
                command: [ "worker" ],
                memory: 1024,
            },
        },
    },
});

export let airflowEndpoint = airflowControllerListener.endpoint().hostname;
export let flowerEndpoint = airflowerListener.endpoint().hostname;
