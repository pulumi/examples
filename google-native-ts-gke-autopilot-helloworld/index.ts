import * as container from "@pulumi/google-native/container/v1beta1";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as kconfig from './kubeconfig';

const config = new pulumi.Config("google-native");
const project = config.require("project");
const region = config.require("region");

// Create a GKE cluster with Autopilot enabled.
const clusterName = "gke-autopilot";
const cluster = new container.Cluster("cluster", {
    name: clusterName,
    parent: `projects/${project}/locations/${region}`,
    autopilot: { enabled: true },
    // The following are redundant and should be removed in the future.
    projectId: project,
    clusterId: clusterName,
    zone: "",
});

export const kubeconfig = kconfig.generate(project, cluster);

const name = "helloworld";
// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider("k8sprovider", {
    kubeconfig: kubeconfig,
}, {
    dependsOn: [cluster],
});

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: clusterProvider });

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
                            ports: [{ name: "http", containerPort: 80 }],
                        },
                    ],
                },
            },
        },
    },
    {
        provider: clusterProvider,
    },
);

// Export the Deployment name
export const deploymentName = deployment.metadata.name;

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(name,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
        },
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 80, targetPort: "http" }],
            selector: appLabels,
        },
    },
    {
        provider: clusterProvider,
    },
);

// Export the Service name and public LoadBalancer endpoint
export const serviceName = service.metadata.name;
export const servicePublicIP = service.status.loadBalancer.ingress[0].ip;
