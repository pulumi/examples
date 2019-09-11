// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
const config = new pulumi.Config();
if (config.require("isMinikube") === "true") {
    throw new Error("This example does not yet support minikube");
}

// Deploy the latest version of the stable/wordpress chart.
const wordpress = new k8s.helm.v2.Chart("wpdev", {
    repo: "stable",
    version: "2.1.3",
    chart: "wordpress",
});

// Export the public IP for Wordpress.
const frontend = wordpress.getResourceProperty("v1/Service", "wpdev-wordpress", "status");
export const frontendIp = frontend.apply(status => status.loadBalancer.ingress[0].ip);
