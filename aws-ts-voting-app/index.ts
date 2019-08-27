// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// Get the password to use for Redis from config.
const config = new pulumi.Config();
const redisPassword = config.require("redisPassword");
const redisPort = 6379;

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
const redisListener = new awsx.elasticloadbalancingv2.NetworkListener("voting-app-cache", { port: redisPort });
const redisCache = new awsx.ecs.FargateService("voting-app-cache", {
    taskDefinitionArgs: {
        containers: {
            redis: {
                image: "redis:alpine",
                memory: 512,
                portMappings: [redisListener],
                command: ["redis-server", "--requirepass", redisPassword],
            },
        },
    },
});

const redisEndpoint = redisListener.endpoint;

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
const frontendListener = new awsx.elasticloadbalancingv2.NetworkListener("voting-app-frontend", { port: 80 });
const frontend = new awsx.ecs.FargateService("voting-app-frontend", {
    taskDefinitionArgs: {
        containers: {
            votingAppFrontend: {
                image: awsx.ecs.Image.fromPath("voting-app-frontend", "./frontend"),   // path to the folder containing the Dockerfile
                memory: 512,
                portMappings: [frontendListener],
                environment: redisEndpoint.apply(e => [
                    { name: "REDIS", value: e.hostname },
                    { name: "REDIS_PORT", value: e.port.toString() },
                    { name: "REDIS_PWD", value: redisPassword },
                ]),
            },
        },
    },
});

// Export a variable that will be displayed during 'pulumi up'
export let frontendURL = frontendListener.endpoint;
