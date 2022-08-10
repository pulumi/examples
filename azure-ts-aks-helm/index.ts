// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";

import * as k8s from "@pulumi/kubernetes";

import * as cluster from "./cluster";

export let clusterName = cluster.k8sCluster.name;

export let kubeconfig = pulumi.secret(cluster.kubeconfig);

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

export let apacheServiceIP = cluster.kubeconfig.apply(kubeconfig => apache
    .getResourceProperty("v1/Service", "default", "apache-chart", "status")
    .apply(status => status.loadBalancer.ingress[0].ip));
