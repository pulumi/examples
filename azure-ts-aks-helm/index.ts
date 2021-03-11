// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";

import * as cluster from "./cluster";

export let clusterName = cluster.k8sCluster.name;

export let kubeconfig = cluster.kubeconfig;

const apache = new k8s.helm.v3.Chart(
    "apache-chart",
    {
        repo: "bitnami",
        chart: "apache",
        version: "8.3.2",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
    },
    { provider: cluster.k8sProvider },
);

export let apacheServiceIP = apache
    .getResourceProperty("v1/Service", "apache-chart", "status")
    .apply(status => status.loadBalancer.ingress[0].ip);
