// Copyright 2017, Pulumi Corporation.  All rights reserved.

// Note: @pulumi/cloud is a preview package demonstrating how to create cross-cloud Pulumi
// components. If you are targeting a specific cloud like AWS, Azure, or GCP, we recommend you use
// platform-specific packages like @pulumi/aws, @pulumi/azure or @pulumi/gcp. These packages give
// you full access to the breadth of the platform's capabilities and comes with many abstractions to
// make developing against that platform easier.

import * as pulumi from "@pulumi/pulumi";
import * as cloud from "@pulumi/cloud";

// Get the password to use for Redis from config.
let config = new pulumi.Config();
let redisPassword = config.require("redisPassword");
let redisPort = 6379;

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
let redisCache = new cloud.Service("voting-app-cache", {
    containers: {
        redis: {
            image: "redis:alpine",
            memory: 512,
            ports: [{ port: redisPort }],
            command: ["redis-server", "--requirepass", redisPassword],
        },
    },
});

let redisEndpoint = redisCache.endpoints.redis[redisPort];

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
let frontend = new cloud.Service("voting-app-frontend", {
    containers: {
        votingAppFrontend: {
            build: "./frontend",   // path to the folder containing the Dockerfile
            memory: 512,
            ports: [{ port: 80 }],
            environment: {
                // pass the Redis container info in environment variables
                "REDIS":      redisEndpoint.hostname,
                "REDIS_PORT": redisEndpoint.apply(e => e.port.toString()),
                "REDIS_PWD":  redisPassword
            }
        },
    },
});

// Export a variable that will be displayed during 'pulumi up'
export let frontendURL = frontend.endpoints["votingAppFrontend"][80].hostname;
