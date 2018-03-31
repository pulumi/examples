// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";

// REDIS MASTER

let redisMasterLabels = { app: "redis", tier: "backend", role: "master"};
let redisMasterService = new kubernetes.Service("redis-master", {
    metadata: {
        name: "redis-master",
        labels: [redisMasterLabels],
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: [redisMasterLabels],
    },
});
let redisMasterDeployment = new kubernetes.Deployment("redis-master", {
    metadata: {
        name: "redis-master",
    },
    spec: {
        selector: redisMasterLabels,
        replicas: 1,
        template: {
            metadata: {
                labels: redisMasterLabels,
            },
            spec: {
                containers: [{
                    name: "master",
                    image: "k8s.gcr.io/redis:e2e",
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "100Mi",
                        },
                    },
                    ports: [{
                        containerPort: 6379,
                    }],
                }],
            },
        },
    },
});

// REDIS SLAVE
let redisSlaveLabels = { app: "redis", tier: "backend", role: "slave" };
let redisSlaveService = new kubernetes.Service("redis-slave", {
    metadata: {
        name: "redis-slave",
        labels: redisSlaveLabels,
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: [redisSlaveLabels],
    },
});
let redisSlaveDeployment = new kubernetes.Deployment("redis-slave", {
    metadata: {
        name: "redis-slave",
    },
    spec: {
        selector: redisSlaveLabels,
        replicas: 1,
        template: {
            metadata: {
                labels: redisSlaveLabels,
            },
            spec: {
                containers: [{
                    name: "slave",
                    image: "gcr.io/google_samples/gb-redisslave:v1",
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "100Mi",
                        },
                    },
                    envs: [{
                        name: "GET_HOSTS_FROM",
                        value: "dns",
                        // If your cluster config does not include a dns service, then to instead access an environment
                        // variable to find the master service's host, comment out the 'value: dns' line above, and
                        // uncomment the line below: 
                        // value: "env"
                    }],
                    ports: [{
                        containerPort: 6379,
                    }],
                }],
            },
        },
    },
});

// FRONTEND
let frontendLabels = { app: "guestbook", tier: "frontend" };
let frontendService = new kubernetes.Service("frontend", {
    metadata: {
        name: "frontend",
        labels: [frontendLabels],
    },
    spec: {
        // If your cluster supports it, uncomment the following to automatically create
        // an external load-balanced IP for the frontend service.
        // type: LoadBalancer
        ports: [{ port: 80 }],
        selector: [frontendLabels],
    },
});
let frontendDeployment = new kubernetes.Deployment("frontend", {
    metadata: {
        name: "frontend",
    },
    spec: {
        selector: frontendLabels,
        replicas: 3,
        template: {
            metadata: {
                labels: frontendLabels,
            },
            spec: {
                containers: [{
                    name: "php-redis",
                    image: "gcr.io/google-samples/gb-frontend:v4",
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "100Mi",
                        },
                    },
                    envs: [{
                        name: "GET_HOSTS_FROM",
                        value: "dns",
                        // If your cluster config does not include a dns service, then to instead access an environment
                        // variable to find the master service's host, comment out the 'value: dns' line above, and
                        // uncomment the line below: 
                        // value: "env"
                    }],
                    ports: [{
                        containerPort: 80,
                    }],
                }],
            },
        },
    },
});
