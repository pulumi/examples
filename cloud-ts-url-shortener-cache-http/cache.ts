// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as cloud from "@pulumi/cloud";
import * as config from "./config";

// A simple cache abstraction that wraps Redis.
export class Cache {
    private readonly redis: cloud.Service;
    private readonly endpoint: pulumi.Output<cloud.Endpoint>;

    constructor(name: string, memory: number = 128) {
        let pw = config.redisPassword;
        this.redis = new cloud.Service(name, {
            containers: {
                redis: {
                    image: "redis:alpine",
                    memory: memory,
                    ports: [{ port: 6379, external: true }],
                    command: ["redis-server", "--requirepass", pw],
                },
            },
        });

        this.endpoint = this.redis.endpoints.apply(endpoints => endpoints.redis[6379]);
    }

    public get(key: string): Promise<string> {
        let ep = this.endpoint.get();
        console.log(`Getting key '${key}' on Redis@${ep.hostname}:${ep.port}`);

        let client = require("redis").createClient(ep.port, ep.hostname, { password: config.redisPassword });
        return new Promise<string>((resolve, reject) => {
            client.get(key, (err: any, v: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(v);
                }
            });
        });
    }

    public set(key: string, value: string): Promise<void> {
        let ep = this.endpoint.get();
        console.log(`Setting key '${key}' to '${value}' on Redis@${ep.hostname}:${ep.port}`);

        let client = require("redis").createClient(ep.port, ep.hostname, { password: config.redisPassword });
        return new Promise<void>((resolve, reject) => {
            client.set(key, value, (err: any, v: any) => {
                if (err) {
                    reject(err);
                } else {
                    console.log("Set succeeed: " + JSON.stringify(v))
                    resolve();
                }
            });
        });
    };
}
