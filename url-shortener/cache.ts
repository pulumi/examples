import * as cloud from "@pulumi/cloud";

// TODO[pulumi/pulumi#397] Would be nice if this was a Secret<T> and closure
// serialization knew to pass it in encrypted env vars.
let redisPassword = "SECRETPASSWORD";

export class Cache {
    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<void>;

    constructor(name: string, memory: number = 128) {
        let redis = new cloud.Service(name, {
            containers: {
                redis: {
                    image: "redis:alpine",
                        memory: memory,
                    ports: [{ port: 6379 }],
                    command: ["redis-server", "--requirepass", redisPassword],
                },
            },
        });
        this.get = (key: string) => {
            
            return redis.getEndpoint("redis", 6379).then(endpoint => {
                
                console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
                let client = require("./bin/redis-client").redisClient(endpoint, redisPassword);

                return new Promise<string>((resolve, reject) => {
                    client.get(key, (err: any, v: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(v);
                        }
                    });
                });
            });
        };

        this.set = (key: string, value: string) => {
            return redis.getEndpoint("redis", 6379).then(endpoint => {
                console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
                let client = require("./bin/redis-client").redisClient(endpoint, redisPassword);
                
                return new Promise<void>((resolve, reject) => {
                    client.set(key, value, (err: any, v: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        };
    }
}
