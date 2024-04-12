// Copyright 2016-2023, Pulumi Corporation.  All rights reserved.

const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const pulumi = require("@pulumi/pulumi");

// An ECS cluster to deploy into.
const cluster = new aws.ecs.Cluster("cluster", {});

// An ALB to serve the container endpoint to the internet.
const loadbalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});

// An ECR repository to store our application's container image.
const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

// Build and publish our application's container image from ./app to the ECR repository.
const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.url,
    context: "./app",
});

// Deploy an ECS Service on Fargate to host the application container.
const service = new awsx.ecs.FargateService("service", {
    cluster: cluster.arn,
    assignPublicIp: true,
    taskDefinitionArgs: {
        container: {
            image: image.imageUri,
            cpu: 128,
            memory: 512,
            essential: true,
            portMappings: [{
                containerPort: 80,
                targetGroup: loadbalancer.defaultTargetGroup,
            }],
        },
    },
});

// The URL at which the container's HTTP endpoint will be available.
exports.frontendURL = pulumi.interpolate`http://${loadbalancer.loadBalancer.dnsName}`;
