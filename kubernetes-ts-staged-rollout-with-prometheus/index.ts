// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as util from "./util";

// Install Prometheus on the cluster.
const prometheus = new k8s.helm.v2.Chart("p8s", {
    repo: "prometheus-community",
    chart: "prometheus",
    version: "13.8.0",
});

const containerName = "example-app";
// Define Pod template that deploys an instrumented app. Annotation `prometheus.io/scrape` instructs
// Prometheus to scrape this pod for metrics.
const instrumentedPod = {
    metadata: { annotations: { "prometheus.io/scrape": "true" }, labels: { app: "example-app" } },
    spec: {
        containers: [
            {
                name: containerName,
                // Prometheus-instrumented app that generates artificial load on itself.
                image: "fabxc/instrumented_app",
                ports: [{ name: "web", containerPort: 8080 }],
            },
        ],
    },
};

const p8sService = prometheus.getResource("v1/Service", "p8s-prometheus-server");
const p8sDeployment = prometheus.getResource(
    "extensions/v1beta1/Deployment",
    "p8s-prometheus-server",
);

// IMPORTANT: This forwards the Prometheus service to localhost, so we can check it. If you are
// running in-cluster, you probably don't need this!
const localPort = 9090;
const forwarderHandle = util.forwardPrometheusService(p8sService, p8sDeployment, {
    localPort,
});

// Canary ring. Replicate instrumented Pod 3 times.
const canary = new k8s.apps.v1beta1.Deployment(
    "canary-example-app",
    { spec: { replicas: 1, template: instrumentedPod } },
    { dependsOn: p8sDeployment },
);

// Staging ring. Replicate instrumented Pod 10 times.
const staging = new k8s.apps.v1beta1.Deployment("staging-example-app", {
    metadata: {
        annotations: {
            // Check P90 latency is < 100,000 microseconds. Returns a `Promise<string>` with the P90
            // response time. It must resolve correctly before this deployment rolls out. In
            // general any `Promise<T>` could go here.
            "example.com/p90ResponseTime": util.checkHttpLatency(canary, containerName, {
                durationSeconds: 60,
                quantile: 0.9,
                thresholdMicroseconds: 100000,
                prometheusEndpoint: `localhost:${localPort}`,
                forwarderHandle,
            }),
        },
    },
    spec: { replicas: 1, template: instrumentedPod },
});

export const p90ResponseTime = staging.metadata.annotations["example.com/p90ResponseTime"];
