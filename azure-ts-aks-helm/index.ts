// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import { k8sCluster, k8sProvider } from "./cluster";

const apache = new k8s.helm.v3.Chart(
    "apache",
    {
        repo: "bitnami",
        chart: "apache",
        version: "1.0.0",
        fetchOpts: {
            repo: "https://charts.bitnami.com/bitnami",
        },
    },
    { providers: { kubernetes: k8sProvider } },
);

export let cluster = k8sCluster.name;
export let kubeConfig = k8sCluster.kubeConfigRaw;
export let serviceIP = apache
    .getResourceProperty("v1/Service", "apache-apache", "status")
    .apply(status => status.loadBalancer.ingress[0].ip);
