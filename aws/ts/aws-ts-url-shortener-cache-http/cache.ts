// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as config from "./config";

// A simple cache abstraction that wraps Redis.
export class Cache {
    private readonly redis: awsx.ecs.FargateService;
    private readonly endpoint: pulumi.Output<string>;

    public get: (key: string) => Promise<string>;
    public set: (key: string, value: string) => Promise<void>;

    constructor(name: string, memory: number = 128) {
        const pw = config.redisPassword;
        const loadBalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});
        this.redis = new awsx.ecs.FargateService(name, {
            taskDefinitionArgs: {
                container: {
                    name: "redis",
                    image: "redis:alpine",
                    memory: memory,
                    portMappings: [{containerPort: 6379, targetGroup: loadBalancer.defaultTargetGroup}],
                    command: ["redis-server", "--requirepass", pw],
                },
            },
        });

        this.endpoint = loadBalancer.loadBalancer.dnsName;

        // Expose get/set as member fields that don't capture 'this'.  That way we don't try to
        // serialize pulumi resources unnecessarily into our lambdas.
        this.get = key => {
            const endpoint = loadBalancer.loadBalancer.dnsName.get();
            const endpointPort = loadBalancer.defaultTargetGroup.port;
            console.log(`Getting key '${key}' on Redis@${endpoint}:${endpointPort}`);

            const client = require("redis").createClient(endpoint, endpointPort, { password: config.redisPassword });
            return new Promise<string>((resolve, reject) => {
                client.get(key, (err: any, v: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(v);
                    }
                });
            });
        };

        this.set = (key, value) => {
            const endpoint = loadBalancer.loadBalancer.dnsName.get();
            const endpointPort = loadBalancer.defaultTargetGroup.port;
            console.log(`Setting key '${key}' to '${value}' on Redis@${endpoint}:${endpointPort}`);

            const client = require("redis").createClient(endpoint, endpointPort, { password: config.redisPassword });
            return new Promise<void>((resolve, reject) => {
                client.set(key, value, (err: any, v: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("Set succeed: " + JSON.stringify(v));
                        resolve();
                    }
                });
            });
        };
    }
}

