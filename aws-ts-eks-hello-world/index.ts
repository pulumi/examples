// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const hostedZoneName = config.get("hostedZoneName");

const name = "helloworld";

// Create an EKS cluster with non-default configuration
const vpc = new awsx.Network(name, { usePrivateSubnets: false });
const cluster = new eks.Cluster(name, {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: cluster.provider });

// Export the Namespace name
export const namespaceName = ns.metadata.name;

// Create a NGINX Deployment
const appLabels = { appClass: name };
const deployment = new k8s.apps.v1.Deployment(name,
    {
        metadata: {
            namespace: namespaceName,
            labels: appLabels,
        },
        spec: {
            replicas: 1,
            selector: { matchLabels: appLabels },
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image: "nginx:latest",
                            ports: [{ name: "http", containerPort: 80 }]
                        }
                    ],
                }
            }
        },
    },
    {
        provider: cluster.provider,
    }
);

// Export the Deployment name
export const deploymentName = deployment.metadata.name;

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(name,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
            annotations: {
                /**
                 * Remove this annotation to use Classic Load Balancer.
                 * https://docs.aws.amazon.com/eks/latest/userguide/load-balancing.html
                 */
                "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
            }
        },
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 80, targetPort: "http" }],
            selector: appLabels,
        },
    },
    {
        provider: cluster.provider,
    }
);

let dnsRecord = undefined;
if (hostedZoneName != undefined) {
    const zoneId = aws.route53.getZone({ name: hostedZoneName }).then(z => z.id);
    const record = new aws.route53.Record(name, {
        zoneId: zoneId,
        type: "CNAME",
        ttl: 300,
        name: service.metadata.name,
        records: [service.status.loadBalancer.ingress[0].hostname],
    });
    dnsRecord = pulumi.interpolate`http://${record.fqdn}/`;
}

// Export the Service name and public LoadBalancer Endpoint
export const serviceName = service.metadata.name;
export const serviceHostname = service.status.apply(s => s.loadBalancer.ingress[0].hostname)
export const serviceDnsName = dnsRecord;
