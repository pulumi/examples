import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as input from "@pulumi/kubernetes/types/input";
import * as pulumi from "@pulumi/pulumi";
import * as nginxIngCntlr from "./nginx-ing-cntlr";

// Creates the NGINX Ingress Controller.
interface NginxArgs {
    image: pulumi.Input<string>;
    replicas: pulumi.Input<number>;
    namespace: pulumi.Input<string>;
    ingressClass: string;
    provider: k8s.Provider;
    nodeSelectorTermValues: pulumi.Input<string>[];
}
export function create(
    name: string,
    args: NginxArgs,
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
                                values: args.nodeSelectorTermValues,
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

    const deployment = nginxIngCntlr.create(name, {
        replicas: args.replicas,
        image: args.image,
        labels: {app: name},
        namespace: args.namespace,
        ingressClass: args.ingressClass,
        affinity: affinity,
        tolerations: tolerations,
        provider: args.provider,
    });

    const service = createService(name, {
        labels: { app: name },
        namespace: args.namespace,
        provider: args.provider,
    });

    return service;
}

// Create the LoadBalancer Service to front the NGINX Ingress Controller,
interface NginxServiceArgs {
    labels: pulumi.Input<any>;
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function createService(
    name: string,
    args: NginxServiceArgs,
): k8s.core.v1.Service {
    const ENABLE_DRAINING: pulumi.Input<{[key: string]: pulumi.Input<string>}> = {
        "service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled": "true",
    };
    const ENABLE_DRAINING_TIMEOUT: pulumi.Input<{[key: string]: pulumi.Input<string>}> = {
        "service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout": "60",
    };
    return new k8s.core.v1.Service(
        name,
        {
            metadata: {
                // NGINX service name is fixed vs auto-named & ref'd in order for
                // nginx-ing-cntlr arg --publish-service to work.
                name: name,
                labels: args.labels,
                namespace: args.namespace,
                annotations: {
                    ...ENABLE_DRAINING,
                    ...ENABLE_DRAINING_TIMEOUT,
                },
            },
            spec: {
                type: "LoadBalancer",
                ports: [{port: 80, protocol: "TCP", targetPort: "http"}],
                selector: args.labels,
            },
        },
        {
            provider: args.provider,
        },
    );
}
