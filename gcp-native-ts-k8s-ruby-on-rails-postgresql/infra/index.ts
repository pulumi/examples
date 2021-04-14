// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as cluster from "./cluster";
import * as config from "./config";
import * as db from "./db";

// We build and push the image to the GCP project's container registry.
// Make sure docker is configured to use docker registry by running
// > gcloud auth configure-docker
// before running pulumi up
const appImage = new docker.Image("rails-app", {
    imageName: pulumi.interpolate`gcr.io/${config.project}/rails-app:latest`,
    build: {
        context: "../app",
    },
});

// Deploy the app container as a Kubernetes load balanced service.
const appPort = 3000;
const appLabels = { app: "rails-app" };
const appDeployment = new k8s.apps.v1.Deployment("rails-deployment", {
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "rails-app",
                    image: appImage.imageName,
                    env: [
                        { name: "DB_HOST", value: db.instance.ipAddresses[0].ipAddress },
                        { name: "DB_USERNAME", value: config.dbUsername },
                        { name: "DB_PASSWORD", value: config.dbPassword },
                    ],
                    ports: [{ containerPort: appPort }],
                }],
            },
        },
    },
}, { provider: cluster.provider });
const appService = new k8s.core.v1.Service("rails-service", {
    metadata: { labels: appDeployment.metadata.labels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: appPort, targetPort: appPort }],
        selector: appDeployment.spec.template.metadata.labels,
    },
}, { provider: cluster.provider });

// Export the app deployment name so we can easily access it.
export let appName = appDeployment.metadata.name;

// Export the service's IP address.
export let appAddress = appService.status.apply(s => `http://${s.loadBalancer.ingress[0].ip}:${appPort}`);

// Export the database address for client connections.
export let dbAddress = db.instance.ipAddresses[0].ipAddress;

// Also export the Kubeconfig so that clients can easily access our cluster.
export let kubeConfig = cluster.kubeConfig;
