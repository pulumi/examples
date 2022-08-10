// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";

// Deploy the bitnami/wordpress chart.
const wordpress = new k8s.helm.v3.Chart("wpdev", {
    version: "15.0.5",
    chart: "wordpress",
    fetchOpts: {
        repo: "https://charts.bitnami.com/bitnami",
    },
});

// Get the IP address once the chart is deployed and ready.
export let wordpressIP = wordpress.ready.apply(ready => wordpress
    .getResourceProperty("v1/Service", "default", "wpdev-wordpress", "status")
    .apply(status => status.loadBalancer.ingress[0].ip));
