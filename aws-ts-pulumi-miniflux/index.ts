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
const vpc = awsx.ec2.Vpc.getDefault();
const cluster = awsx.ecs.Cluster.getDefault();

// Create a new subnet group for the database.
const subnetGroup = new aws.rds.SubnetGroup("dbsubnets", {
    subnetIds: vpc.publicSubnetIds,
});

// Create a new database, using the subnet and cluster groups.
const db = new aws.rds.Instance("db", {
    engine: "postgres",
    instanceClass: aws.rds.InstanceTypes.T3_Micro,
    allocatedStorage: 5,
    dbSubnetGroupName: subnetGroup.id,
    vpcSecurityGroupIds: cluster.securityGroups.map(g => g.id),
    name: dbName,
    username: dbUsername,
    password: dbPassword,
    skipFinalSnapshot: true,
});

// Assemble a connection string for the Miniflux service.
const connectionString = pulumi.interpolate `postgres://${dbUsername}:${dbPassword}@${db.endpoint}/miniflux?sslmode=disable`;

// Create an NetworkListener to forward HTTP traffic on port 8080.
const listener = new awsx.lb.NetworkListener("lb", { port: 8080 });

// Create a Fargate service consisting of just one container instance (since that's all we
// really need), passing it the cluster, DB connection and Pulumi config settings.
const service = new awsx.ecs.FargateService("service", {
    cluster,
    desiredCount: 1,
    taskDefinitionArgs: {
        containers: {
            service: {
                image: "miniflux/miniflux:latest",
                portMappings: [
                    listener,
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
    },
}, {
    customTimeouts: {
        create: "20m",
        update: "20m",
        delete: "20m",
    },
});

// Export the publicly accessible URL.
export const url = pulumi.interpolate `http://${listener.endpoint.hostname}:${listener.endpoint.port}`;
