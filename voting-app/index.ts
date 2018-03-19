// Copyright 2017, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as cloud from "@pulumi/cloud";

// Get the password to use for Redis from config.
let config = new pulumi.Config("voting-app");
let redisPassword = config.require("redisPassword"); 

// The data layer for the application
// Use the 'image' property to point to a pre-built Docker image.
let redisCache = new cloud.Service("voting-app-cache", {
    containers: {
        redis: {
            image: "redis:alpine",
            memory: 128,
            ports: [{ port: 6379 }],
            command: ["redis-server", "--requirepass", redisPassword],
        },
    },
});

// A custom container for the frontend, which is a Python Flask app
// Use the 'build' property to specify a folder that contains a Dockerfile.
// Pulumi builds the container for you and pushes to an ECR registry
let frontend = new cloud.Service("voting-app-frontend", {
    containers: {
        votingAppFrontend: {
            build: "./frontend",   // path to the folder containing the Dockerfile
            memory: 128,
            ports: [{ port: 80 }],            
            environment: { 
                // pass the Redis container info in environment variables
                // (the use of promises will be improved in the future)
                "REDIS": redisCache.getEndpoint().then(e => e.hostname),
                "REDIS_PORT": redisCache.getEndpoint().then(e => e.port.toString()),
                "REDIS_PWD": redisPassword
            }
        },
    },
});

// Export a variable that will be displayed during 'pulumi update'
export let frontendURL = frontend.getEndpoint().then(e => `http://${e.hostname}:${e.port}`);
