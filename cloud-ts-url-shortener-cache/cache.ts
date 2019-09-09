// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

// Note: @pulumi/cloud is a preview package demonstrating how to create cross-cloud Pulumi
// components. If you are targeting a specific cloud like AWS, Azure, or GCP, we recommend you use
// platform-specific packages like @pulumi/aws, @pulumi/azure or @pulumi/gcp. These packages give
// you full access to the breadth of the platform's capabilities and comes with many abstractions to
// make developing against that platform easier.

import * as cloud from "@pulumi/cloud";
import * as config from "./config";

// A simple cache abstraction that wraps Redis.
export class Cache {
    public readonly get: (key: string) => Promise<string>;
    public readonly set: (key: string, value: string) => Promise<void>;

    private readonly redis: cloud.Service;

    constructor(name: string, memory: number = 128) {
        const pw = config.redisPassword;
        this.redis = new cloud.Service(name, {
            containers: {
                redis: {
                    image: "redis:alpine",
                    memory: memory,
                    ports: [{ port: 6379 }],
                    command: ["redis-server", "--requirepass", pw],
                },
            },
        });

        const endpoint = this.redis.endpoints.redis[6379];
        this.get = async (key: string) => {
            const ep = (await endpoint).get();
            console.log(`Getting key '${key}' on Redis@${ep.hostname}:${ep.port}`);

            const client = require("redis").createClient(ep.port, ep.hostname, { password: pw });
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

        this.set = async (key: string, value: string) => {
            const ep = (await endpoint).get();
            console.log(`Setting key '${key}' to '${value}' on Redis@${ep.hostname}:${ep.port}`);

            const client = require("redis").createClient(ep.port, ep.hostname, { password: pw });
            return new Promise<void>((resolve, reject) => {
                client.set(key, value, (err: any, v: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("Set succeeed: " + JSON.stringify(v));
                        resolve();
                    }
                });
            });
        };
    }
}
