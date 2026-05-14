// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.
import * as cluster from "./cluster";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export const clusterName = cluster.k8sCluster.name;

export const kubeconfig = pulumi.secret(cluster.kubeconfig);

const apache = new k8s.helm.v3.Chart(
    "apache-chart",
    {
        chart: "apache",
        version: "9.1.17",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
    },
    { provider: cluster.k8sProvider },
);

export const apacheServiceIP = cluster.kubeconfig.apply(kubeconfig => apache
    .getResourceProperty("v1/Service", "default", "apache-chart", "status")
    .apply(status => status.loadBalancer.ingress[0].ip));
