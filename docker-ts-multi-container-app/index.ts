// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

// Set defaults for redis
const redisPort = 6379;
const redisHost = "redisdb";

// Create docker network
const network = new docker.Network("network", {
    name: "services",
});

// Get redis image
const redisImage = new docker.RemoteImage("redisImage", {
    name: "redis:6.2",
    keepLocally: true,
});

// Run redis image
const redisContainer = new docker.Container("redisContainer", {
    image: redisImage.latest,
    ports: [
        { internal: redisPort, external: redisPort},
    ],
    networksAdvanced: [
        {name: network.name, aliases: [redisHost]},
    ],
});

// Create image from local app
const appImage = new docker.Image("appImage", {
    build: {
        context: "./app",
    },
    imageName: "app",
    skipPush: true,
});

// Set external port for app url
const appPort = 3000;

// Run container from local app image
const appContainer = new docker.Container("appContainer", {
    image: appImage.baseImageName,
    ports: [
        {internal: appPort, external: appPort},
    ],
    envs: [
        pulumi.interpolate`REDIS_HOST=${redisHost}`,
        pulumi.interpolate`REDIS_PORT=${redisPort}`,
    ] ,
    networksAdvanced: [
        {name: network.name},
    ],
}, {dependsOn: [redisContainer]});

export const url = pulumi.interpolate`http://localhost:${appPort}`;
