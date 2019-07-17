import * as k8s from "@pulumi/kubernetes";
import * as input from "@pulumi/kubernetes/types/input";
import * as pulumi from "@pulumi/pulumi";
import * as rbac from "./nginx-ing-cntlr-rbac";

// Create the NGINX Ingress Controller ServiceAccount, RBAC, Configmap, Deployment,
// and Pod Disruption Budget.
interface NginxStackArgs {
    replicas: pulumi.Input<number>;
    image: pulumi.Input<string>;
    labels: pulumi.Input<any>;
    namespace: pulumi.Input<string>;
    ingressClass: pulumi.Input<string>;
    affinity: input.core.v1.Affinity;
    tolerations: input.core.v1.Toleration[];
    provider: k8s.Provider;
}
export function create(
    name: string,
    args: NginxStackArgs,
): k8s.apps.v1.Deployment {

    const defaultHttpBackendName = "nginx-default-http-backend";

    // ServiceAccount.
    const serviceAccount = rbac.makeNginxServiceAccount(name, {
        namespace: args.namespace,
        provider: args.provider,
    });
    const serviceAccountName = serviceAccount.metadata.name;

    // RBAC ClusterRole.
    const clusterRole = rbac.makeNginxClusterRole(name, {
        provider: args.provider,
    });
    const clusterRoleName = clusterRole.metadata.name;
    const clusterRoleBinding = rbac.makeNginxClusterRoleBinding(name, {
        namespace: args.namespace,
        serviceAccountName: serviceAccountName,
        clusterRoleName: clusterRoleName,
        provider: args.provider,
    });

    // RBAC Role.
    const role = rbac.makeNginxRole(name, {
        namespace: args.namespace,
        ingressClass: args.ingressClass,
        provider: args.provider,
    });
    const roleName = role.metadata.name;
    const roleBinding = rbac.makeNginxRoleBinding(name, {
        namespace: args.namespace,
        serviceAccountName: serviceAccountName,
        roleName: roleName,
        provider: args.provider,
    });

    // NGINX Settings ConfigMap.
    const configMap = makeConfigMap(name, {
        labels: args.labels,
        namespace: args.namespace,
        provider: args.provider,
    });
    const configMapName = configMap.metadata.name;

    // Assemble the resources.
    // Per: https://itnext.io/kubernetes-ingress-controllers-how-to-choose-the-right-one-part-1-41d3554978d2
    const resources: input.core.v1.ResourceRequirements = {
        requests: {memory: "1Gi"},
        limits: {memory: "2Gi"},
    };

    // Create the Deployment.
    const deployment = makeDeployment(name, {
        replicas: args.replicas,
        image: args.image,
        labels: args.labels,
        namespace: args.namespace,
        resources: resources,
        ingressClass: args.ingressClass,
        serviceAccountName: serviceAccountName,
        configMapName: configMapName,
        affinity: args.affinity,
        tolerations: args.tolerations,
        provider: args.provider,
    });

    // Create the PodDisruptionBudget with a minimum availability of 2 pods.
    const pdb = makePodDisruptionBudget(name, {
        minAvailable: 2,
        labels: args.labels,
        namespace: args.namespace,
        provider: args.provider,
    });

    return deployment;
}

// Create a ConfigMap for the NGINX Ingress Controller settings.
interface NginxConfigMapArgs {
    labels: pulumi.Input<any>;
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeConfigMap(
    name: string,
    args: NginxConfigMapArgs,
): k8s.core.v1.ConfigMap {
    return new k8s.core.v1.ConfigMap(
        name,
        {
            metadata: {
                labels: args.labels,
                namespace: args.namespace,
            },
            data: {
                "keep-alive": "200", // https://www.nginx.com/blog/testing-performance-nginx-ingress-controller-kubernetes/
                "keep-alive-requests": "10000",
                "proxy-connect-timeout": "10", // https://git.io/fjwCj
                "proxy-read-timeout": "120", // https://git.io/fjwCj
                "proxy-send-timeout": "120", // https://git.io/fjwCj
                "proxy-next-upstream": "error timeout http_502 http_503 http_504", // https://git.io/fjwWe
                "upstream-keepalive-connections": "128",
                "upstream-keepalive-timeout": "315", // https://www.nginx.com/blog/testing-performance-nginx-ingress-controller-kubernetes/
                "upstream-keepalive-requests": "1000000", // https://www.nginx.com/blog/testing-performance-nginx-ingress-controller-kubernetes/
                "worker-processes": "8", // https://itnext.io/kubernetes-ingress-controllers-how-to-choose-the-right-one-part-1-41d3554978d2
                "worker-shutdown-timeout": "60s",
            },
        },
        {
            provider: args.provider,
        },
    );
}

// Create the Deployment.
interface NginxDeploymentArgs {
    replicas: pulumi.Input<number>;
    image: pulumi.Input<string>;
    labels: pulumi.Input<any>;
    namespace: pulumi.Input<string>;
    resources: pulumi.Input<any>;
    ingressClass: pulumi.Input<string>;
    affinity: input.core.v1.Affinity;
    tolerations: input.core.v1.Toleration[];
    serviceAccountName: pulumi.Input<string>;
    configMapName: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeDeployment(
    name: string,
    args: NginxDeploymentArgs,
): k8s.apps.v1.Deployment {
    // Run as www-data user / id 33
    const wwwDataUser: number = 33;
    return new k8s.apps.v1.Deployment(name,
        {
            metadata: {
                labels: args.labels,
                annotations: {
                    "prometheus.io/port": "10254",
                    "prometheus.io/scrape": "true",
                },
                namespace: args.namespace,
            },
            spec: {
                strategy: {
                    type: "RollingUpdate",
                    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 },
                },
                replicas: args.replicas,
                selector: { matchLabels: args.labels },
                template: {
                    metadata: { labels: args.labels, namespace: args.namespace },
                    spec: {
                        serviceAccountName: args.serviceAccountName,
                        terminationGracePeriodSeconds: 120,
                        affinity: args.affinity,
                        tolerations: args.tolerations,
                        containers: [
                            {
                                name: name,
                                image: args.image,
                                resources: args.resources,
                                ports: [{ name: "http", containerPort: 80 }],
                                securityContext: {
                                    allowPrivilegeEscalation: true,
                                    capabilities: {
                                        drop: ["ALL"],
                                        add: ["NET_BIND_SERVICE"],
                                    },
                                    runAsUser: wwwDataUser,
                                },
                                env: [
                                    {
                                        name: "POD_NAME",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.name",
                                           },
                                        },
                                    },
                                    {
                                        name: "POD_NAMESPACE",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.namespace",
                                            },
                                        },
                                    },
                                ],
                                readinessProbe: {
                                    httpGet: {
                                        path: "/healthz",
                                        port: 10254,
                                        scheme: "HTTP",
                                    },
                                    timeoutSeconds: 10,
                                    periodSeconds: 10,
                                    successThreshold: 1,
                                    failureThreshold: 3,
                                },
                                livenessProbe: {
                                    httpGet: {
                                        path: "/healthz",
                                        port: 10254,
                                        scheme: "HTTP",
                                    },
                                    initialDelaySeconds: 10,
                                    timeoutSeconds: 10,
                                    periodSeconds: 10,
                                    successThreshold: 1,
                                    failureThreshold: 3,
                                },
                                lifecycle: {
                                  preStop: {
                                    exec: {
                                      command: ["sleep", "20"],
                                    },
                                  },
                                },
                                // For more info on all CLI args available:
                                // https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/cli-arguments.md
                                args: pulumi.all([
                                    "/nginx-ingress-controller",
                                    pulumi.concat("--configmap=$(POD_NAMESPACE)/", args.configMapName),
                                    // NGINX service name is fixed vs auto-named & ref'd in order for
                                    // nginx-ing-cntlr arg --publish-service to work.
                                    pulumi.concat("--publish-service=$(POD_NAMESPACE)/", name),
                                    "--annotations-prefix=nginx.ingress.kubernetes.io",
                                    "--ingress-class=" + args.ingressClass,
                                    "--v=2",
                                ]),
                            },
                        ],
                    },
                },
            },
        },
        {
            provider: args.provider,
        },
    );
}

// Create a PodDisruptionBudget for the Deployment Pods.
interface PodDisruptionBudgetArgs {
    minAvailable: pulumi.Input<number>;
    labels: pulumi.Input<any>;
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makePodDisruptionBudget(
    name: string,
    args: PodDisruptionBudgetArgs,
): k8s.policy.v1beta1.PodDisruptionBudget {
    return new k8s.policy.v1beta1.PodDisruptionBudget(
        name,
        {
            metadata: {
                labels: args.labels,
                namespace: args.namespace,
            },
            spec: {
                minAvailable: args.minAvailable,
                selector: { matchLabels: args.labels },
            },
        },
        {
            provider: args.provider,
        },
    );
}
