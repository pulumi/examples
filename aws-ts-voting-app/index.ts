// Copyright 2017, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

// Get the password to use for Redis from config.
let config = new pulumi.Config();
let redisPassword = config.require("redisPassword");
let redisPort = 6379;

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
let redisListener = new awsx.elasticloadbalancingv2.NetworkListener("voting-app-cache", { port: redisPort });
let redisCache = new awsx.ecs.FargateService("voting-app-cache", {
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

let redisEndpoint = redisListener.endpoint();

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
let frontendListener = new awsx.elasticloadbalancingv2.NetworkListener("voting-app-frontend", { port: 80 });
let frontend = new awsx.ecs.FargateService("voting-app-frontend", {
    taskDefinitionArgs: {
        containers: {
            votingAppFrontend: {
                image: awsx.ecs.Image.fromPath("./frontend"),   // path to the folder containing the Dockerfile
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
export let frontendURL = frontendListener.endpoint();
