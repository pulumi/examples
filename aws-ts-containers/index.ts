// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// Create an elastic network listener to listen for requests and route them to the container.
// See https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
// for more details.
const listener = new awsx.elasticloadbalancingv2.NetworkListener("nginx", { port: 80 });

// Define the service to run.  We pass in the listener to hook up the network load balancer
// to the containers the service will launch.
const service = new awsx.ecs.FargateService("nginx", {
    desiredCount: 2,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecs.Image.fromPath("nginx", "./app"),
                memory: 512,
                portMappings: [listener],
            },
        },
    },
});

export let frontendURL = pulumi.interpolate `http://${listener.endpoint.hostname}/`;
