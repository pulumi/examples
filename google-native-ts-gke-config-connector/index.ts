// Copyright 2016-2021, Pulumi Corporation.

import * as google from "@pulumi/google-native";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config("google-native");
const project = config.require("project");

// TODO: Determine this dynamically once https://github.com/pulumi/pulumi-google-native/issues/166 is done.
const engineVersion = "1.19.9-gke.1900";

const nodeConfig: google.types.input.container.v1.NodeConfigArgs = {
    machineType: "n1-standard-2",
    oauthScopes: [
        "https://www.googleapis.com/auth/compute",
        "https://www.googleapis.com/auth/devstorage.read_only",
        "https://www.googleapis.com/auth/logging.write",
        "https://www.googleapis.com/auth/monitoring",
    ],
    preemptible: true,
};

// Create a GKE cluster with the config connector addon enabled.
const cluster = new google.container.v1.Cluster("cluster", {
    initialClusterVersion: engineVersion,
    nodePools: [{
        config: nodeConfig,
        initialNodeCount: 1,
        management: {
            autoRepair: false,
        },
        name: "initial",
    }],
    addonsConfig: {
        configConnectorConfig: {
            enabled: true,
        },
    },
    loggingService: "logging.googleapis.com/kubernetes", // stackdriver
    workloadIdentityConfig: {
        workloadPool: `${project}.svc.id.goog`,
    },
});

// Create a kubeconfig to connect to the GKE cluster.
const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(
    ([name, endpoint, auth]) => {
        const context = `${project}_${name}`;
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true
`;
    });

// Create a Provider to use the new kubeconfig.
const k8sProvider = new k8s.Provider("k8s", {kubeconfig});

// Create a random suffix for the ServiceAccount.
const saSuffix = new random.RandomPet("saSuffix", {length: 1}).id;

// Create a ServiceAccount for the config connector.
const serviceAccount = new google.iam.v1.ServiceAccount("gkeConfigConnector", {
    accountId: pulumi.interpolate`gke-config-connector-${saSuffix}`,
});

// Add new IAM bindings for the config connector.
// Note: These bindings will not be removed during a destroy operation on this resource, and should be removed manually.
google.cloudresourcemanager.v1.getProjectIamPolicy({
    resource: project,
}).then(x => {
    return new google.cloudresourcemanager.v1.ProjectIamPolicy("iam", {
        bindings: [
            ...x.bindings,
            {
                members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
                role: "roles/owner",
            },
            {
                members: [pulumi.interpolate`serviceAccount:${project}.svc.id.goog[cnrm-system/cnrm-controller-manager]`],
                role: "roles/iam.workloadIdentityUser",
            },
        ],
        resource: project,
    });
});

// Create the Config Connector namespace.
const ccNamespace = new k8s.core.v1.Namespace("config-connector", {
    metadata: {
        annotations: {
            "cnrm.cloud.google.com/project-id": project,
        },
    },
});

// TODO: This would be easier with https://github.com/pulumi/pulumi-kubernetes/issues/264.
// In the meantime, we create this resource in two steps:
// 1. Import the existing ConfigConnector resource.
// 2. Update the ConfigConnector resource under Pulumi management.

// Step 1
// Once the GKE cluster has been created, run another update with this block uncommented:
// const configConnector = new k8s.apiextensions.CustomResource("config-connector", {
//     apiVersion: "core.cnrm.cloud.google.com/v1beta1",
//     kind: "ConfigConnector",
//     metadata: {
//         // The name is restricted to ensure that there is only one ConfigConnector resource installed in your cluster
//         name: "configconnector.core.cnrm.cloud.google.com",
//     },
// }, {provider: k8sProvider, import: "configconnector.core.cnrm.cloud.google.com"});

// Step 2
// On subsequent updates, comment out the previous import block and run this one instead.
// const configConnector = new k8s.apiextensions.CustomResource("config-connector", {
//     apiVersion: "core.cnrm.cloud.google.com/v1beta1",
//     kind: "ConfigConnector",
//     metadata: {
//         // The name is restricted to ensure that there is only one ConfigConnector resource installed in your cluster
//         name: "configconnector.core.cnrm.cloud.google.com",
//     },
//     spec: {
//         mode: "cluster",
//         googleServiceAccount: serviceAccount.email,
//     },
// }, {provider: k8sProvider});
