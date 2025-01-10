// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const name = config.get("name") ||
    "gke-serviceaccount-example";
export const masterVersion = config.get("masterVersion") ||
    gcp.container.getEngineVersions().then(it => it.latestMasterVersion);
const machineType = "n1-standard-1" || config.get("machineType");

// Create a service account
const serviceAccount = new gcp.serviceAccount.Account("serviceAccount", {
    accountId: name,
    displayName: "A service account for a GKE application",
});

const serviceAccountIAM = new gcp.projects.IAMBinding("serviceAccount-pub", {
    role: "roles/pubsub.subscriber",
    members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
}, {parent: serviceAccount});

const serviceAccountKey = new gcp.serviceAccount.Key("serviceAccount-key", {
    serviceAccountId: serviceAccount.name,
    publicKeyType: "TYPE_X509_PEM_FILE",
}, {parent: serviceAccount, additionalSecretOutputs: ["privateKey"]});

// Create a GKE cluster
const cluster = new gcp.container.Cluster(name, {
    // We can't create a cluster with no node pool defined, but we want to only use
    // separately managed node pools. So we create the smallest possible default
    // node pool and immediately delete it.
    initialNodeCount: 1,
    removeDefaultNodePool: true,

    minMasterVersion: masterVersion,
});

const nodePool = new gcp.container.NodePool(`primary-node-pool`, {
    cluster: cluster.name,
    initialNodeCount: 2,
    location: cluster.location,
    nodeConfig: {
        preemptible: true,
        machineType: machineType,
        oauthScopes: [
            "https://www.googleapis.com/auth/compute",
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring",
        ],
    },
    version: masterVersion,
    management: {
        autoRepair: true,
    },
}, {
    dependsOn: [cluster],
});

// Export the Cluster name
export const clusterName = cluster.name;

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(([name, endpoint, masterAuth]) => {
    const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
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

// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider(name, {
    kubeconfig: kubeconfig,
}, {
    dependsOn: [nodePool],
});

const appLabels = {appClass: "pubsub"};

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace("pubsub-ns", {
    metadata: {
        name: "pubsub",
        labels: appLabels,
    },
}, {provider: clusterProvider});


const gcpCredentials = new k8s.core.v1.Secret("gcp-credentials", {
    metadata: {
        namespace: ns.metadata.name,
        labels: appLabels,
    },
    type: "Opaque",
    stringData: {
        "gcp-credentials.json": serviceAccountKey.privateKey.apply((x) => Buffer.from(x, "base64").toString("utf8")),
    },
}, {provider: clusterProvider, parent: ns});

const deployment = new k8s.apps.v1.Deployment("pubsub",
    {
        metadata: {
            namespace: ns.metadata.name,
            labels: appLabels,
        },
        spec: {
            replicas: 1,
            selector: {matchLabels: appLabels},
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {
                    volumes: [
                        {
                            name: "google-cloud-key",
                            secret: {
                                secretName: gcpCredentials.metadata.name,
                            },
                        },
                    ],
                    containers: [
                        {
                            name: "pubsub-example",
                            image: "gcr.io/google-samples/pubsub-sample:v1",
                            volumeMounts: [
                                {
                                    name: "google-cloud-key",
                                    mountPath: "/var/secrets/google",
                                },
                            ],
                            env: [{
                                name: "GOOGLE_APPLICATION_CREDENTIALS",
                                value: "/var/secrets/google/gcp-credentials.json",
                            }],
                        },
                    ],
                },
            },
        },
    },
    {
        provider: clusterProvider, parent: ns,
    },
);
