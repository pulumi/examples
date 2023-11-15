// Copyright 2016-2023, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";

// Create an ECS Fargate cluster.
const cluster = new awsx.classic.ecs.Cluster("cluster");

// Define the Networking for our service.
const alb = new awsx.classic.lb.ApplicationLoadBalancer(
    "net-lb", { external: true, securityGroups: cluster.securityGroups });
const web = alb.createListener("web", { port: 80, external: true });

// Create a repository for container images.
const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

// Build and publish a Docker image to a private ECR registry.
const img = new awsx.ecr.Image("app-img", { repositoryUrl: repo.url, context: "./app" });

// Create a Fargate service task that can scale out.
const appService = new awsx.classic.ecs.FargateService("app-svc", {
    cluster,
    taskDefinitionArgs: {
        container: {
            image: img.imageUri,
            cpu: 102 /*10% of 1024*/,
            memory: 50 /*MB*/,
            portMappings: [ web ],
        },
    },
    desiredCount: 5,
});

// Export the Internet address for the service.
export const url = web.endpoint.hostname;
