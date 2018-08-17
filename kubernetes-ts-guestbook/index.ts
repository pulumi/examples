// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as util from "./util";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
let config = new pulumi.Config("guestbook");
let isMinikube = config.require("isMinikube");

//
// REDIS MASTER.
//

let redisMasterDeployment = util.deployContainer("redis-master", 1, {
    name: "master",
    image: "k8s.gcr.io/redis:e2e",
    resources: { requests: { cpu: "100m", memory: "100Mi" } },
    ports: [{ containerPort: 6379 }]
});
let redisMasterService = new k8s.core.v1.Service("redis-master", {
    metadata: {
        labels: redisMasterDeployment.metadata.apply(meta => meta.labels)
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: redisMasterDeployment.spec.apply(spec => spec.template.metadata.labels)
    }
});

//
// REDIS SLAVE.
//

let redisSlaveDeployment = util.deployContainer("redis-slave", 1, {
    name: "slave",
    image: "gcr.io/google_samples/gb-redisslave:v1",
    resources: { requests: { cpu: "100m", memory: "100Mi" } },
    // If your cluster config does not include a dns service, then to instead access an environment
    // variable to find the master service's host, change `value: "dns"` to read `value: "env"`.
    env: [{ name: "GET_HOSTS_FROM", value: "dns" }],
    ports: [{ containerPort: 6379 }]
});
let redisSlaveService = new k8s.core.v1.Service("redis-slave", {
    metadata: { labels: redisSlaveDeployment.metadata.apply(meta => meta.labels) },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: redisSlaveDeployment.spec.apply(spec => spec.template.metadata.labels)
    }
});

//
// FRONTEND
//

let frontendDeployment = util.deployContainer("frontend", 3, {
    name: "php-redis",
    image: "gcr.io/google-samples/gb-frontend:v4",
    resources: { requests: { cpu: "100m", memory: "100Mi" } },
    // If your cluster config does not include a dns service, then to instead access an environment
    // variable to find the master service's host, change `value: "dns"` to read `value: "env"`.
    env: [{ name: "GET_HOSTS_FROM", value: "dns" /* value: "env"*/ }],
    ports: [{ containerPort: 80 }]
});
let frontendService = new k8s.core.v1.Service("frontend", {
    metadata: { labels: frontendDeployment.metadata.apply(meta => meta.labels) },
    spec: {
        type: isMinikube === "true" ? "ClusterIP" : "LoadBalancer",
        ports: [{ port: 80 }],
        selector: frontendDeployment.spec.apply(spec => spec.template.metadata.labels)
    }
});

// Export the frontend IP.
export let frontendIp: pulumi.Output<string>;
if (isMinikube === "true") {
    frontendIp = frontendService.spec.apply(spec => spec.clusterIP);
} else {
    frontendIp = frontendService.status.apply(status => status.loadBalancer.ingress[0].ip);
}
