import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as input from "@pulumi/kubernetes/types/input";
import * as pulumi from "@pulumi/pulumi";
import * as nginxIngCntlr from "./nginx-ing-cntlr";

// Creates the NGINX Ingress Controller.
export function create(
    name: string,
    replicas: pulumi.Input<number>,
    namespace: pulumi.Input<string>,
    ingressClass: string,
    cluster: eks.Cluster,
    nodeSelectorValues: pulumi.Input<string>[],
): k8s.core.v1.Service {
    // Define the Node affinity to target for the NGINX Deployment.
    const affinity: input.core.v1.Affinity = {
        // Target the Pods to run on nodes that match the labels for the node
        // selector.
        nodeAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                    {
                        matchExpressions: [
                            {
                                key: "beta.kubernetes.io/instance-type",
                                operator: "In",
                                values: nodeSelectorValues,
                            },
                        ],
                    },
                ],
            },
        },
        // Don't co-locate running Pods with matching labels on the same node,
        // and spread them per the node hostname.
        podAntiAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: [
                {
                    topologyKey: "kubernetes.io/hostname",
                    labelSelector: {
                        matchExpressions: [
                            {
                                key: "app",
                                operator: "In",
                                values: [ name ],
                            },
                        ],
                    },
                },
            ],
        },
    };

    // Define the Pod tolerations of the tainted Nodes to target.
    const tolerations: input.core.v1.Toleration[] = [
        {
            key: "nginx",
            value: "true",
            effect: "NoSchedule",
        },
    ];

    const deployment = nginxIngCntlr.create(name,
        {app: name},
        cluster.provider,
        replicas,
        namespace,
        ingressClass,
        affinity,
        tolerations,
    );

    const service = createService(name,
        namespace,
        { app: name },
        cluster.provider,
    );

    return service;
}

// Create the LoadBalancer Service to front the NGINX Ingress Controller,
export function createService(
    name: string,
    namespace: pulumi.Input<string>,
    labels: pulumi.Input<any>,
    provider: k8s.Provider,
): k8s.core.v1.Service {
    return new k8s.core.v1.Service(
        name,
        {
            metadata: {
                name: name,
                labels: labels,
                namespace: namespace,
                annotations: {
                    "service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled": "true",
                    "service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout": "60",
                },
            },
            spec: {
                type: "LoadBalancer",
                ports: [{port: 80, protocol: "TCP", targetPort: "http"}],
                selector: labels,
            },
        },
        {
            provider: provider,
        },
    );
}
