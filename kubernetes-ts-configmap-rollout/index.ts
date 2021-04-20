// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
const config = new pulumi.Config();
const isMinikube = config.require("isMinikube");

const appName = "nginx";
const appLabels = { app: appName };

// nginx Configuration data to proxy traffic to `pulumi.github.io`. Read from
// `default.conf` file.
const nginxConfig = new k8s.core.v1.ConfigMap(appName, {
    metadata: { labels: appLabels },
    data: { "default.conf": fs.readFileSync("default.conf").toString() },
});
const nginxConfigName = nginxConfig.metadata.apply(m => m.name);

// Deploy 1 nginx replica, mounting the configuration data into the nginx
// container.
const nginx = new k8s.apps.v1.Deployment(appName, {
    metadata: { labels: appLabels },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [
                    {
                        image: "nginx:1.13.6-alpine",
                        name: "nginx",
                        volumeMounts: [{ name: "nginx-configs", mountPath: "/etc/nginx/conf.d" }],
                    },
                ],
                volumes: [{ name: "nginx-configs", configMap: { name: nginxConfigName } }],
            },
        },
    },
});

// Expose proxy to the public Internet.
const frontend = new k8s.core.v1.Service(appName, {
    metadata: { labels: nginx.spec.template.metadata.labels },
    spec: {
        type: isMinikube === "true" ? "ClusterIP" : "LoadBalancer",
        ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
        selector: appLabels,
    },
});

// Export the frontend IP.
export let frontendIp: pulumi.Output<string>;
if (isMinikube === "true") {
    frontendIp = frontend.spec.clusterIP;
} else {
    frontendIp = frontend.status.loadBalancer.ingress[0].ip;
}
