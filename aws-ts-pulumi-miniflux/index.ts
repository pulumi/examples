// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// Import our Pulumi configuration.
const config = new pulumi.Config();
const dbName = config.require("db_name");
const dbUsername = config.require("db_username");
const dbPassword = config.require("db_password");
const adminUsername = config.require("admin_username");
const adminPassword = config.require("admin_password");

// Get the default VPC and ECS Cluster for your account.
// const vpcId = aws.ec2.getVpc({ default: true }, { async: true }).then(r => r.id);
// const vpc = aws.ec2.getVpcOutput({ default: true }, { async: true });
const vpc = new aws.ec2.DefaultVpc("defaultVpc", {});
const subnet = new aws.ec2.Subnet("defaultSubnet", { vpcId: vpc.id });

// Create a new subnet group for the database.
const subnetGroup = new aws.rds.SubnetGroup("dbsubnets", {
    subnetIds: [subnet.id],
});

const cluster = new aws.ecs.Cluster("cluster", {});

// Create a new database, using the subnet and cluster groups.
const db = new aws.rds.Instance("db", {
    engine: "postgres",
    instanceClass: aws.rds.InstanceTypes.T3_Micro,
    allocatedStorage: 5,
    dbSubnetGroupName: subnetGroup.id,
    // vpcSecurityGroupIds: cluster.securityGroups.map(g => g.id),
    name: dbName,
    username: dbUsername,
    password: dbPassword,
    skipFinalSnapshot: true,
});

// Assemble a connection string for the Miniflux service.
const connectionString = pulumi.interpolate `postgres://${dbUsername}:${dbPassword}@${db.endpoint}/${dbName}?sslmode=disable`;

const loadBalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});

// Create a Fargate service consisting of just one container instance (since that's all we
// really need), passing it the cluster, DB connection and Pulumi config settings.
const service = new awsx.ecs.FargateService("service", {
    cluster: cluster.arn,
    desiredCount: 1,
    taskDefinitionArgs: {
        container: {
            name: "service",
            image: "miniflux/miniflux:latest",
            portMappings: [
                {containerPort: 8080, targetGroup: loadBalancer.defaultTargetGroup},
            ],
            environment: [
                { name: "DATABASE_URL", value: connectionString },
                { name: "RUN_MIGRATIONS", value: "1" },
                { name: "CREATE_ADMIN", value: "1" },
                { name: "ADMIN_USERNAME", value: adminUsername },
                { name: "ADMIN_PASSWORD", value: adminPassword },
            ],
        },
    },
}, {
    customTimeouts: {
        create: "20m",
        update: "20m",
        delete: "20m",
    },
});

// Export the publicly accessible URL.
export const url = pulumi.interpolate `http://${loadBalancer.loadBalancer.dnsName}:8080}`;
