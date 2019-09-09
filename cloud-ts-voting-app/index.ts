// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

// Note: @pulumi/cloud is a preview package demonstrating how to create cross-cloud Pulumi
// components. If you are targeting a specific cloud like AWS, Azure, or GCP, we recommend you use
// platform-specific packages like @pulumi/aws, @pulumi/azure or @pulumi/gcp. These packages give
// you full access to the breadth of the platform's capabilities and comes with many abstractions to
// make developing against that platform easier.

import * as cloud from "@pulumi/cloud";
import * as pulumi from "@pulumi/pulumi";

// Get the password to use for Redis from config.
const config = new pulumi.Config();
const redisPassword = config.require("redisPassword");
const redisPort = 6379;

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
const redisCache = new cloud.Service("voting-app-cache", {
    containers: {
        redis: {
            image: "redis:alpine",
            memory: 512,
            ports: [{ port: redisPort }],
            command: ["redis-server", "--requirepass", redisPassword],
        },
    },
});

const redisEndpoint = redisCache.endpoints.redis[redisPort];

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
const frontend = new cloud.Service("voting-app-frontend", {
    containers: {
        votingAppFrontend: {
            build: "./frontend",   // path to the folder containing the Dockerfile
            memory: 512,
            ports: [{ port: 80 }],
            environment: {
                // pass the Redis container info in environment variables
                "REDIS":      redisEndpoint.hostname,
                "REDIS_PORT": redisEndpoint.apply(e => e.port.toString()),
                "REDIS_PWD":  redisPassword,
            },
        },
    },
});

// Export a variable that will be displayed during 'pulumi up'
export let frontendURL = frontend.endpoints["votingAppFrontend"][80].hostname;
