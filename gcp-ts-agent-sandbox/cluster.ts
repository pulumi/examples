// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { masterVersion, nodeMachineType, sandboxNodeCount, systemNodeCount } from "./config";

// A dedicated VPC for the sandboxes, rather than the project's default network.
// The egress rules in `AgentSandbox` only mean something if we control what is
// reachable on the other side of the pod, which means owning the network too.
export const network = new gcp.compute.Network("agent-sandbox-net", {
    autoCreateSubnetworks: false,
});

// The cluster is zonal (it uses gcp:zone), and a regional resource like the
// subnet must live in the same region. Derive the region from the zone
// (us-central1-a -> us-central1) so setting only gcp:zone can't strand the
// subnet in a different region than the cluster.
const region = gcp.config.region || (gcp.config.zone ?? "us-central1-a").replace(/-[a-z]$/, "");

// VPC-native cluster: pods and services get their own secondary ranges. Naming
// them here and referencing them from the cluster keeps the IP plan in one place.
export const subnet = new gcp.compute.Subnetwork("agent-sandbox-subnet", {
    network: network.id,
    ipCidrRange: "10.60.0.0/20",
    region,
    secondaryIpRanges: [
        { rangeName: "pods", ipCidrRange: "10.61.0.0/16" },
        { rangeName: "services", ipCidrRange: "10.62.0.0/20" },
    ],
});

// A GKE Standard cluster. GKE Sandbox (gVisor) node pools require Standard mode,
// so Autopilot is not an option here. We remove the default node pool and manage
// the pools explicitly.
export const cluster = new gcp.container.Cluster("agent-sandbox", {
    initialNodeCount: 1,
    removeDefaultNodePool: true,
    minMasterVersion: masterVersion,
    deletionProtection: false,
    network: network.id,
    subnetwork: subnet.id,
    ipAllocationPolicy: {
        clusterSecondaryRangeName: "pods",
        servicesSecondaryRangeName: "services",
    },
});

// System pool on a normal (unsandboxed) runtime. The agent-sandbox controller
// and cluster services run here; they don't need gVisor.
const systemPool = new gcp.container.NodePool("system-pool", {
    cluster: cluster.name,
    location: cluster.location,
    initialNodeCount: systemNodeCount,
    version: masterVersion,
    nodeConfig: {
        machineType: "e2-standard-2",
        oauthScopes: [
            "https://www.googleapis.com/auth/cloud-platform",
        ],
    },
    management: { autoRepair: true },
}, { dependsOn: [cluster] });

// The single definition of the gVisor runtime class name. The node pool that
// provides the runtime and every Sandbox that requests it both import this, so
// the request and the runtime cannot drift apart.
export const GVISOR = "gvisor";

// gVisor sandbox pool. Setting `sandboxConfig.sandboxType: "gvisor"` turns on
// GKE Sandbox: every pod scheduled here runs under the gVisor userspace kernel
// instead of sharing the host kernel. GKE then automatically installs the
// `gvisor` RuntimeClass, labels these nodes `sandbox.gke.io/runtime: gvisor`,
// and taints them `sandbox.gke.io/runtime=gvisor:NoSchedule`, so only pods that
// opt in (via runtimeClassName + toleration) land here. gVisor requires the
// Container-Optimized OS containerd image.
export const gvisorPool = new gcp.container.NodePool("gvisor-pool", {
    cluster: cluster.name,
    location: cluster.location,
    initialNodeCount: sandboxNodeCount,
    version: masterVersion,
    nodeConfig: {
        machineType: nodeMachineType,
        imageType: "COS_CONTAINERD",
        sandboxConfig: {
            sandboxType: GVISOR,
        },
        oauthScopes: [
            "https://www.googleapis.com/auth/cloud-platform",
        ],
    },
    management: { autoRepair: true },
}, { dependsOn: [cluster] });

// Manufacture a GKE-style kubeconfig. GKE expects the gke-gcloud-auth-plugin for
// cluster authentication rather than raw client certs.
export const kubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, auth]) => {
        const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
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

// A Kubernetes provider bound to the new cluster. Depends on both pools so the
// controller has somewhere to schedule.
export const k8sProvider = new k8s.Provider("gke", {
    kubeconfig,
}, { dependsOn: [systemPool, gvisorPool] });
