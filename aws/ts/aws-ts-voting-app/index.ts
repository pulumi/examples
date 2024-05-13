// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// Get the password to use for Redis from config.
const config = new pulumi.Config();
const redisPassword = config.require("redisPassword");
const redisPort = 6379;

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
const redisLB = new awsx.lb.ApplicationLoadBalancer("voting-app-cache", {});
const redisCache = new awsx.ecs.FargateService("voting-app-cache", {
    taskDefinitionArgs: {
        container: {
            name: "redis",
            image: "redis:alpine",
            memory: 512,
            portMappings: [{ containerPort: redisPort, targetGroup: redisLB.defaultTargetGroup }],
            command: ["redis-server", "--requirepass", redisPassword],
        },
    },
});

const redisEndpoint = redisLB.loadBalancer.dnsName;
const redistHostPort = redisLB.defaultTargetGroup.port;

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
const frontendLB = new awsx.lb.ApplicationLoadBalancer("voting-app-frontend", {});
const repo = new awsx.ecr.Repository("repo", {});
const image = new awsx.ecr.Image("voting-app-frontend", {
    repositoryUrl: repo.url,
    context: "./frontend",
});
const frontend = new awsx.ecs.FargateService("voting-app-frontend", {
    taskDefinitionArgs: {
        container: {
            name: "votingAppFrontend",
            image: image.imageUri,
            memory: 512,
            portMappings: [{ containerPort: 80, targetGroup: frontendLB.defaultTargetGroup }],
            environment: pulumi.all([redisEndpoint, redistHostPort]).apply(([e, p]) => [
                { name: "REDIS", value: e },
                { name: "REDIS_PORT", value: p?.toString() },
                { name: "REDIS_PWD", value: redisPassword },
            ]),
        },
    },
});

// Export a variable that will be displayed during 'pulumi up'
export let frontendURL = pulumi.interpolate`http://${frontendLB.loadBalancer.dnsName}:${frontendLB.defaultTargetGroup.port}`;
