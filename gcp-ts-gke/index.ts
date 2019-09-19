// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { k8sConfig, k8sProvider } from "./cluster";

// Create a canary deployment to test that this cluster works.
const name = `${pulumi.getProject()}-${pulumi.getStack()}`;
const canaryLabels = { app: `canary-${name}` };
const canary = new k8s.apps.v1.Deployment("canary", {
    spec: {
        selector: { matchLabels: canaryLabels },
        replicas: 1,
        template: {
            metadata: { labels: canaryLabels },
            spec: { containers: [{ name, image: "nginx" }] },
        },
    },
}, { provider: k8sProvider });

// Export the Kubeconfig so that clients can easily access our cluster.
export let kubeConfig = k8sConfig;
