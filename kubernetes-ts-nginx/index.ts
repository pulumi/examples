// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const nginxLabels = { app: "nginx" };
const nginxDeployment = new k8s.apps.v1.Deployment("nginx-deployment", {
    spec: {
        selector: { matchLabels: nginxLabels },
        replicas: config.getNumber("replicas") || 2,
        template: {
            metadata: { labels: nginxLabels },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:1.7.9",
                    ports: [{ containerPort: 80 }],
                }],
            },
        },
    },
});

export const nginx = nginxDeployment.metadata.name;
