// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { k8sCluster, k8sProvider } from "./cluster";

const apache = new k8s.helm.v3.Chart(
    "apache",
    {
        repo: "bitnami",
        chart: "apache",
        version: "9.1.17",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
    },
    { provider: k8sProvider },
);

export let cluster = k8sCluster.name;
export let kubeConfig = k8sCluster.kubeConfigRaw;
// Wait for the cluster to be ready before trying to get the IP info.
export let serviceIP = pulumi.unsecret(k8sCluster.kubeConfigRaw.apply(kubeconfig => apache
    .getResourceProperty("v1/Service", "default", "apache", "status")
    .apply(status => status.loadBalancer.ingress[0].ip)));
