import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as inputApi from "@pulumi/kubernetes/types/input";

export interface ClusterOpts {
    replicas?: pulumi.Input<number>;
    storageClassName?: pulumi.Input<string>;
    resourceLimit?: pulumi.Input<object>;
    resourceRequest?: pulumi.Input<object>;
    securityCapabilities?: pulumi.Input<inputApi.core.v1.Capabilities>;
    heapSize?: pulumi.Input<string>;
    heapNewSize?: pulumi.Input<string>;
    volumeClaimRequests?: pulumi.Input<object>;

    transforms?: [(a: inputApi.apps.v1.StatefulSet) => void];
}

export class Cluster extends k8s.apps.v1.StatefulSet {
    constructor(name: string, args?: ClusterOpts, opts?: pulumi.CustomResourceOptions) {
        super(name, base(args), opts);
    }
}

function base(opts?: ClusterOpts): inputApi.apps.v1.StatefulSet {
    const labels = { app: "cassandra" };
    const replicas = (opts && opts.replicas) || 3;
    const storageClassName = (opts && opts.storageClassName) || "fast";
    const resourceLimit = (opts && opts.resourceLimit) || { cpu: "500m", memory: "1Gi" };
    const resourceRequest = (opts && opts.resourceRequest) || { cpu: "500m", memory: "1Gi" };
    const securityCapabilities = (opts && opts.securityCapabilities) || { add: ["IPC_LOCK"] };
    const heapSize = (opts && opts.heapSize) || "512M";
    const heapNewSize = (opts && opts.heapNewSize) || "100M";
    const volumeClaimRequests = (opts && opts.volumeClaimRequests) || { storage: "1Gi" };

    const args = {
        metadata: { labels: labels },
        spec: {
            serviceName: "cassandra",
            replicas: replicas,
            selector: { matchLabels: labels },
            template: {
                metadata: { labels: labels },
                spec: {
                    terminationGracePeriodSeconds: 1800,
                    containers: [
                        {
                            name: "cassandra",
                            image: "gcr.io/google-samples/cassandra:v13",
                            imagePullPolicy: "Always",
                            ports: [
                                { containerPort: 7000, name: "intra-node" },
                                { containerPort: 7001, name: "tls-intra-node" },
                                { containerPort: 7199, name: "jmx" },
                                { containerPort: 9042, name: "cql" }
                            ],
                            resources: {
                                limits: resourceLimit,
                                requests: resourceRequest
                            },
                            securityContext: { capabilities: securityCapabilities },
                            lifecycle: {
                                preStop: { exec: { command: ["/bin/sh", "-c", "nodetool drain"] } }
                            },
                            env: [
                                { name: "MAX_HEAP_SIZE", value: heapSize },
                                { name: "HEAP_NEWSIZE", value: heapNewSize },
                                {
                                    name: "CASSANDRA_SEEDS",
                                    value: "cassandra-0.cassandra.default.svc.cluster.local"
                                },
                                { name: "CASSANDRA_CLUSTER_NAME", value: "K8Demo" },
                                { name: "CASSANDRA_DC", value: "DC1-K8Demo" },
                                { name: "CASSANDRA_RACK", value: "Rack1-K8Demo" },
                                {
                                    name: "POD_IP",
                                    valueFrom: { fieldRef: { fieldPath: "status.podIP" } }
                                }
                            ],
                            readinessProbe: {
                                exec: { command: ["/bin/bash", "-c", "/ready-probe.sh"] },
                                initialDelaySeconds: 15,
                                timeoutSeconds: 5
                            },
                            // These volume mounts are persistent. They are like inline claims, but
                            // not exactly because the names need to match exactly one of the
                            // stateful pod volumes.
                            volumeMounts: [{ name: "cassandra-data", mountPath: "/cassandra_data" }]
                        }
                    ]
                }
            },
            // These are converted to volume claims by the controller and mounted at the paths
            // mentioned above. do not use these in production until ssd GCEPersistentDisk or other
            // ssd pd
            volumeClaimTemplates: [
                {
                    metadata: { name: "cassandra-data" },
                    spec: {
                        accessModes: ["ReadWriteOnce"],
                        storageClassName: storageClassName,
                        resources: { requests: volumeClaimRequests }
                    }
                }
            ]
        }
    };

    for (const t of (opts && opts.transforms) || []) {
        t(args);
    }

    return args;
}
