// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as eksdistro from "./eksdistro";

const store = new aws.s3.Bucket("kops-state-store");

const cluster = new eksdistro.Cluster("cluster", {
    name: "luke.cluster.pulumi-demos.net",
    state: pulumi.interpolate`s3://${store.id}`,
});

const k8sProvider = new k8s.Provider("provider", { kubeconfig: cluster.kubeconfig });

const pod = new k8s.core.v1.Pod("mypod", {
    spec: {
        containers: [{ name: "echo", image: "k8s.gcr.io/echoserver:1.4" }],
    },
}, { provider: k8sProvider });

export const kubeconfig = cluster.kubeconfig;
