// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as k8sjs from "./k8sjs";

const config = new pulumi.Config();

const redisLeader = new k8sjs.ServiceDeployment("redis-leader", {
    image: "redis",
    ports: [6379],
});

const redisReplica = new k8sjs.ServiceDeployment("redis-replica", {
    image: "pulumi/guestbook-redis-replica",
    ports: [6379],
});

const frontend = new k8sjs.ServiceDeployment("frontend", {
    replicas: 3,
    image: "pulumi/guestbook-php-redis",
    ports: [80],
    allocateIpAddress: true,
    isMinikube: config.getBoolean("isMinikube"),
});

export let frontendIp = frontend.ipAddress;
