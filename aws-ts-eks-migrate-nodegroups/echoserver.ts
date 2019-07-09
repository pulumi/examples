import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Create the echoserver workload's Service, Deployment and Ingress.
export function create(
    name: string,
    replicas: pulumi.Input<number>,
    namespace: pulumi.Input<string>,
    ingressClass: pulumi.Input<string>,
    provider: k8s.Provider,
): k8s.core.v1.Service {

    const labels = {app: name};

    // Create the Service.
    const service = createService(name, labels, namespace, provider);
    const serviceName = service.metadata.apply(m => m.name);

    // Deploy the echoserver in the general, standard nodegroup.
    const deployment = createDeployment(name, replicas, labels, namespace, provider);

    // Create the Ingress.
    const ingress = createIngress(name, labels, namespace, ingressClass,
        serviceName, provider);

    return service;
}

// Create the Ingress.
export function createIngress(
    name: string,
    labels: pulumi.Input<any>,
    namespace: pulumi.Input<string>,
    ingressClass: pulumi.Input<string>,
    serviceName: pulumi.Input<string>,
    provider: k8s.Provider,
): k8s.extensions.v1beta1.Ingress {
    return new k8s.extensions.v1beta1.Ingress(
        name,
        {
            metadata: {
                labels: labels,
                namespace: namespace,
                annotations: {
                    "kubernetes.io/ingress.class": ingressClass,
                },
            },
            spec: {
                rules: [
                    {
                        host: "apps.example.com",
                        http: {
                            paths: [
                                {
                                    path: "/echoserver",
                                    backend: {
                                        serviceName: serviceName,
                                        servicePort: "http",
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            provider: provider,
        },
    );
}

// Create the Service.
export function createService(
    name: string,
    labels: pulumi.Input<any>,
    namespace: pulumi.Input<string>,
    provider: k8s.Provider,
): k8s.core.v1.Service {
    return new k8s.core.v1.Service(
        name,
        {
            metadata: {
                name: name,
                labels: {app: name},
                namespace: namespace,
            },
            spec: {
                type: "ClusterIP",
                ports: [{port: 80, protocol: "TCP", targetPort: "http"}],
                selector: {app: name},
            },
        },
        {
            provider: provider,
        },
    );
}

// Create the Deployment.
export function createDeployment(
    name: string,
    replicas: pulumi.Input<number>,
    labels: pulumi.Input<any>,
    namespace: pulumi.Input<string>,
    provider: k8s.Provider,
): k8s.apps.v1.Deployment {
    return new k8s.apps.v1.Deployment(name,
        {
            metadata: {
                labels: labels,
                namespace: namespace,
            },
            spec: {
                replicas: replicas,
                selector: { matchLabels: labels },
                template: {
                    metadata: { labels: labels, namespace: namespace },
                    spec: {
                        restartPolicy: "Always",
                        containers: [
                            {
                                name: name,
                                image: "gcr.io/google-containers/echoserver:1.5",
                                ports: [{ name: "http", containerPort: 8080 }],
                            },
                        ],
                    },
                },
            },
        },
        {
            provider: provider,
        },
    );
}
