// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Deploy the bitnami/wordpress chart.
const wordpress = new k8s.helm.v3.Release("wpdev", {
    chart: "wordpress",
    repositoryOpts: {
        repo: "https://charts.bitnami.com/bitnami",
    },
    version: "13.0.6",
    // Force to use ClusterIP so no assumptions on support for LBs etc. is required.
    values: {
        service: {
            type: "ClusterIP",
        },
    },
});

// Get the status field from the wordpress service, and then grab a reference to the spec.
const svc = k8s.core.v1.Service.get("wpdev-wordpress", pulumi.interpolate`${wordpress.status.namespace}/${wordpress.status.name}-wordpress`);
// Export the Cluster IP for Wordpress.
export const frontendIp = svc.spec.clusterIP;
// Command to run to access the wordpress frontend on localhost:8080
export const portForwardCommand = pulumi.interpolate`kubectl port-forward svc/${svc.metadata.name} 8080:80`;
