// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// REDIS MASTER

let redisMasterLabels = { app: "redis", tier: "backend", role: "master"};
let redisMasterService = new k8s.core.v1.Service("redis-master", {
    metadata: {
        name: "redis-master",
        labels: [redisMasterLabels],
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: [redisMasterLabels],
    },
});
let redisMasterDeployment = new k8s.apps.v1.Deployment("redis-master", {
    metadata: {
        name: "redis-master",
    },
    spec: {
        selector: {
            matchLabels: redisMasterLabels
        },
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
let redisSlaveService = new k8s.core.v1.Service("redis-slave", {
    metadata: {
        name: "redis-slave",
        labels: redisSlaveLabels,
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: [redisSlaveLabels],
    },
});
let redisSlaveDeployment = new k8s.apps.v1.Deployment("redis-slave", {
    metadata: {
        name: "redis-slave",
    },
    spec: {
        selector: {
            matchLabels: redisSlaveLabels
        },
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
                    env: [{
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
let frontendService = new k8s.core.v1.Service("frontend", {
    metadata: {
        name: "frontend",
        labels: [frontendLabels],
    },
    spec: {
        // If your cluster does not support `LoadBalancer` (such as on minikube), comment out the it, uncomment the
        // following to automatically create an external load-balanced IP for the frontend service.
        type: "LoadBalancer",
        ports: [{ port: 80 }],
        selector: [frontendLabels],
    },
});
let frontendDeployment = new k8s.apps.v1.Deployment("frontend", {
    metadata: {
        name: "frontend",
    },
    spec: {
        selector: {
            matchLabels: frontendLabels
        },
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
                    env: [{
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
