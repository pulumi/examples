// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as s3Helpers from "./s3Helpers";
import * as util from "./util";

// Generate S3 bucket; put the local file `default.conf` inside it.
const nginxConfigBucket = new s3Helpers.FileBucket("nginx-configs", {
    files: ["default.conf"],
    policy: s3Helpers.publicReadPolicy,
});
const bucketId = nginxConfigBucket.fileIdFromHashedContents("default.conf");

// The URL at which the nginx config is stored.
export const nginxConfigUrl = nginxConfigBucket.getUrlForFile("default.conf");

// Shared volume where the init containers will get the nginx config data from S3, and the nginx
// container will pick it up to initialize itself.
const nginxConfigVol = { name: bucketId, emptyDir: {} };
const nginxConfigMount = { name: nginxConfigVol.name, mountPath: "/etc/nginx/conf.d" };

// Deploy 1 replica of nginx. Use `curl` to get `default.conf` from a public S3 bucket, which
// configures nginx to act as a proxy for `pulumi.github.io`.
const nginx = new k8s.apps.v1.Deployment("nginx", {
    spec: {
        selector: {matchLabels: { app: "nginx" } },
        replicas: 1,
        template: {
            metadata: { labels: { app: "nginx" } },
            spec: {
                // `curl` the nginx configuration out of `nginxConfigUrl`, the public S3 bucket.
                // Place in a volume shared with the `nginx` container.
                initContainers: [util.curl(nginxConfigUrl, "default.conf", nginxConfigMount)],
                // nginx container, picks up the configuration file automatically.
                containers: [
                    {
                        image: "nginx:1.13.6-alpine",
                        name: "nginx",
                        volumeMounts: [nginxConfigMount],
                    },
                ],
                volumes: [nginxConfigVol],
            },
        },
    },
});

// Expose proxy to the public Internet.
const frontend = new k8s.core.v1.Service("nginx", {
    metadata: { labels: nginx.spec.template.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
        selector: nginx.spec.template.metadata.labels,
    },
});

// Export the frontend IP.
export const frontendIp = frontend.status.loadBalancer.ingress[0].ip;
