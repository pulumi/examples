// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as cloud from "@pulumi/cloud";
import * as config from "./config";

// A simple cache abstraction that wraps Redis.
export class Cache {
    public readonly get: (key: string) => Promise<string>;
    public readonly set: (key: string, value: string) => Promise<void>;

    private readonly redis: cloud.Service;

    constructor(name: string, memory: number = 128) {
        let pw = config.redisPassword;
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

        let endpoint = this.redis.endpoints.apply(endpoints => endpoints.redis[6379]);
        this.get = async (key: string) => {
            let ep = (await endpoint).get();
            console.log(`Getting key '${key}' on Redis@${ep.hostname}:${ep.port}`);

            let client = require("redis").createClient(ep.port, ep.hostname, { password: pw });
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
            let ep = (await endpoint).get();
            console.log(`Setting key '${key}' to '${value}' on Redis@${ep.hostname}:${ep.port}`);

            let client = require("redis").createClient(ep.port, ep.hostname, { password: pw });
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
}
