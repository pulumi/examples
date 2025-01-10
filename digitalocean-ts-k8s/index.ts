// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as digitalocean from "@pulumi/digitalocean";
import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Enable some configurable parameters.
const config = new pulumi.Config();
const nodeCount = config.getNumber("nodeCount") || 2;
const appReplicaCount = config.getNumber("appReplicaCount") || 5;
const domainName = config.get("domainName");

// Provision a DigitalOcean Kubernetes cluster and export its resulting
// kubeconfig to make it easy to access from the kubectl command line.
const cluster = new digitalocean.KubernetesCluster("do-cluster", {
    region: digitalocean.Region.NYC3,
    version: digitalocean.getKubernetesVersions().then(p => p.latestVersion),
    nodePool: {
        name: "default",
        size: digitalocean.DropletSlug.DropletS2VCPU2GB,
        nodeCount: nodeCount,
    },
});

// The DigitalOcean Kubernetes cluster periodically gets a new certificate,
// so we look up the cluster by name and get the current kubeconfig after
// initial provisioning. You'll notice that the `certificate-authority-data`
// field changes on every `pulumi update`.
const kubeconfig = cluster.status.apply(status => {
    if (status === "running") {
        const clusterDataSource = cluster.name.apply(name => digitalocean.getKubernetesCluster({name}));
        return clusterDataSource.kubeConfigs[0].rawConfig;
    } else {
        return cluster.kubeConfigs[0].rawConfig;
    }
});

// Now lets actually deploy an application to our new cluster. We begin
// by creating a new "Provider" object that uses our kubeconfig above,
// so that any application objects deployed go to our new cluster.
const provider = new kubernetes.Provider("do-k8s", { kubeconfig });

// Now create a Kubernetes Deployment using the "nginx" container
// image from the Docker Hub, replicated a number of times, and a
// load balanced Service in front listening for traffic on port 80.
const appLabels = { "app": "app-nginx" };
const app = new kubernetes.apps.v1.Deployment("do-app-dep", {
    spec: {
        selector: { matchLabels: appLabels },
        replicas: appReplicaCount,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx",
                }],
            },
        },
    },
}, { provider });
const appService = new kubernetes.core.v1.Service("do-app-svc", {
    spec: {
        type: "LoadBalancer",
        selector: app.spec.template.metadata.labels,
        ports: [{ port: 80 }],
    },
}, { provider });
export const ingressIp = appService.status.loadBalancer.ingress[0].ip;

// Finally, optionally set up a DigitalOcean DNS entry for our
// resulting load balancer's IP address. This gives us a stable URL
// for our cluster'sapplication.
if (domainName) {
    const domain = new digitalocean.Domain("do-domain", {
        name: domainName,
        ipAddress: ingressIp,
    });

    const cnameRecord = new digitalocean.DnsRecord("do-domain-cname", {
        domain: domain.name,
        type: "CNAME",
        name: "www",
        value: "@",
    });
}
