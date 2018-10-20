// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as cassandra from "./cassandra";

// NOTE: Swap out this storage class for one appropriate to your cloud provider.
new k8s.storage.v1.StorageClass("fast", {
    metadata: { name: "fast" },
    provisioner: "k8s.io/minikube-hostpath",
    parameters: { type: "pd-ssd" }
});

new cassandra.Cluster("cassandra", {
    replicas: 3,
    storageClassName: "fast",
    resourceLimit: { cpu: "500m", memory: "1Gi" },
    resourceRequest: { cpu: "500m", memory: "1Gi" },
    securityCapabilities: { add: ["IPC_LOCK"] },
    heapSize: "512M",
    heapNewSize: "100M",
    volumeClaimRequests: { storage: "1Gi" }
});
