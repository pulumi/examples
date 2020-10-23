// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";

// Deploy the bitnami/wordpress chart.
const wordpress = new k8s.helm.v3.Chart("wpdev", {
    version: "9.6.0",
    chart: "wordpress",
    fetchOpts: {
        repo: "https://charts.bitnami.com/bitnami",
    },
});

// Get the status field from the wordpress service, and then grab a reference to the ingress field.
const frontend = wordpress.getResourceProperty("v1/Service", "wpdev-wordpress", "status");
const ingress = frontend.loadBalancer.ingress[0];

// Export the public IP for Wordpress.
// Depending on the k8s cluster, this value may be an IP address or a hostname.
export const frontendIp = ingress.apply(x => x.ip ?? x.hostname);
