// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as helm from "@pulumi/kubernetes/helm";
import { k8sCluster, k8sProvider } from "./cluster";

const apache = new helm.v2.Chart(
    "apache",
    {
        repo: "bitnami",
        chart: "apache",
        version: "1.0.0",
    },
    { providers: { kubernetes: k8sProvider } },
);

export let cluster = k8sCluster.name;
export let kubeConfig = k8sCluster.kubeConfigRaw;
export let serviceIP = apache
    .getResourceProperty("v1/Service", "apache-apache", "status")
    .apply(status => status.loadBalancer.ingress[0].ip);
