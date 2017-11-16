// Copyright 2017, Pulumi Corporation.  All rights reserved.

import * as cloud from "@pulumi/cloud";

// To simplify this example, we have defined the password directly in code
// In a real app, would add the secret via `pulumi config secret <key> <value>` and
// access via config APIs
let redisPassword = "SECRETPASSWORD"; 

let redisPort = 6379;

let redisCache = new cloud.Service("voting-app-cache", {
    containers: {
        redis: {
            image: "redis:alpine",
            memory: 128,
            ports: [{ port: redisPort }],
            command: ["redis-server", "--requirepass", redisPassword],
        },
    },
});

let frontend = new cloud.Service("voting-app-frontend", {
    containers: {
        votingAppFrontend: {
            build: "./frontend",
            memory: 128,
            ports: [{ port: 80 }],            
            environment: { 
                // pass in the created container info in environment variables
                "REDIS": redisCache.getEndpoint("redis", redisPort).then(e => e.hostname),
                "REDIS_PORT": redisPort.toString(),
                "FOO": redisPort.toString(),
                "REDIS_PWD": redisPassword
            }
        },
    },
});

frontend.getEndpoint().then(e => e.hostname).then(hostname =>  console.log(`URL: ${hostname}`));
