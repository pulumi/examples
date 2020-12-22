// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
const config = new pulumi.Config();
if (config.require("isMinikube") === "true") {
    throw new Error("This example does not yet support minikube");
}

const sockShopNs = new k8s.core.v1.Namespace("sock-shop", { metadata: { name: "sock-shop" } });

// --------------------------------------------------------------------------
// Carts microservice.
// -------------------------------------------------------------------------

const cartsDb = new k8s.apps.v1.Deployment("carts-db", {
    metadata: {
        name: "carts-db",
        labels: {
            name: "carts-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "carts-db",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "carts-db",
                },
            },
            spec: {
                containers: [
                    {
                        name: "carts-db",
                        image: "mongo",
                        ports: [
                            {
                                name: "mongo",
                                containerPort: 27017,
                            },
                        ],
                        securityContext: {
                            capabilities: {
                                drop: ["all"],
                                add: ["CHOWN", "SETGID", "SETUID"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const cartsDbService = new k8s.core.v1.Service("carts-db", {
    metadata: {
        name: "carts-db",
        labels: {
            name: "carts-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 27017,
                targetPort: 27017,
            },
        ],
        selector: cartsDb.spec.template.metadata.labels,
    },
});

const carts = new k8s.apps.v1.Deployment("carts", {
    metadata: {
        name: "carts",
        labels: {
            name: "carts",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "carts",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "carts",
                },
            },
            spec: {
                containers: [
                    {
                        name: "carts",
                        image: "weaveworksdemos/carts:0.4.8",
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        env: [
                            {
                                name: "ZIPKIN",
                                value: "zipkin.jaeger.svc.cluster.local",
                            },
                            {
                                name: "JAVA_OPTS",
                                value:
                                    "-Xms64m -Xmx128m -XX:PermSize=32m -XX:MaxPermSize=64m -XX:+UseG1GC -Djava.security.egd=file:/dev/urandom",
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const cartsService = new k8s.core.v1.Service("carts", {
    metadata: {
        name: "carts",
        labels: {
            name: "carts",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: carts.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Catalog microservice.
// --------------------------------------------------------------------------

const catalogDb = new k8s.apps.v1.Deployment("catalog-db", {
    metadata: {
        name: "catalogue-db",
        labels: {
            name: "catalogue-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "catalogue-db",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "catalogue-db",
                },
            },
            spec: {
                containers: [
                    {
                        name: "catalogue-db",
                        image: "weaveworksdemos/catalogue-db:0.3.0",
                        env: [
                            {
                                name: "MYSQL_ROOT_PASSWORD",
                                value: "fake_password",
                            },
                            {
                                name: "MYSQL_DATABASE",
                                value: "socksdb",
                            },
                        ],
                        ports: [
                            {
                                name: "mysql",
                                containerPort: 3306,
                            },
                        ],
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const catalogDbService = new k8s.core.v1.Service("catalog-db", {
    metadata: {
        name: "catalogue-db",
        labels: {
            name: "catalogue-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 3306,
                targetPort: 3306,
            },
        ],
        selector: catalogDb.spec.template.metadata.labels,
    },
});

const catalog = new k8s.apps.v1.Deployment("catalog", {
    metadata: {
        name: "catalogue",
        labels: {
            name: "catalogue",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "catalogue",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "catalogue",
                },
            },
            spec: {
                containers: [
                    {
                        name: "catalogue",
                        image: "weaveworksdemos/catalogue:0.3.5",
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const catalogService = new k8s.core.v1.Service("catalog", {
    metadata: {
        name: "catalogue",
        labels: {
            name: "catalogue",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: catalog.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Frontend microservice.
// --------------------------------------------------------------------------

const frontend = new k8s.apps.v1.Deployment("front-end", {
    metadata: {
        name: "front-end",
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "front-end",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "front-end",
                },
            },
            spec: {
                containers: [
                    {
                        name: "front-end",
                        image: "weaveworksdemos/front-end:0.3.12",
                        resources: {
                            requests: {
                                cpu: "100m",
                                memory: "100Mi",
                            },
                        },
                        ports: [
                            {
                                containerPort: 8079,
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const frontendService = new k8s.core.v1.Service("front-end", {
    metadata: {
        name: "front-end",
        labels: {
            name: "front-end",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        type: "NodePort",
        ports: [
            {
                port: 80,
                targetPort: 8079,
                nodePort: 30001,
            },
        ],
        selector: frontend.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Orders microservice.
// --------------------------------------------------------------------------

const ordersDb = new k8s.apps.v1.Deployment("orders-db", {
    metadata: {
        name: "orders-db",
        labels: {
            name: "orders-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "orders-db",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "orders-db",
                },
            },
            spec: {
                containers: [
                    {
                        name: "orders-db",
                        image: "mongo",
                        ports: [
                            {
                                name: "mongo",
                                containerPort: 27017,
                            },
                        ],
                        securityContext: {
                            capabilities: {
                                drop: ["all"],
                                add: ["CHOWN", "SETGID", "SETUID"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const ordersDbService = new k8s.core.v1.Service("orders-db", {
    metadata: {
        name: "orders-db",
        labels: {
            name: "orders-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 27017,
                targetPort: 27017,
            },
        ],
        selector: ordersDb.spec.template.metadata.labels,
    },
});

const orders = new k8s.apps.v1.Deployment("orders", {
    metadata: {
        name: "orders",
        labels: {
            name: "orders",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "orders",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "orders",
                },
            },
            spec: {
                containers: [
                    {
                        name: "orders",
                        image: "weaveworksdemos/orders:0.4.7",
                        env: [
                            {
                                name: "ZIPKIN",
                                value: "zipkin.jaeger.svc.cluster.local",
                            },
                            {
                                name: "JAVA_OPTS",
                                value:
                                    "-Xms64m -Xmx128m -XX:PermSize=32m -XX:MaxPermSize=64m -XX:+UseG1GC -Djava.security.egd=file:/dev/urandom",
                            },
                        ],
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const ordersService = new k8s.core.v1.Service("orders", {
    metadata: {
        name: "orders",
        labels: {
            name: "orders",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: orders.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Payment microservice.
// --------------------------------------------------------------------------

const payment = new k8s.apps.v1.Deployment("payment", {
    metadata: {
        name: "payment",
        labels: {
            name: "payment",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "payment",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "payment",
                },
            },
            spec: {
                containers: [
                    {
                        name: "payment",
                        image: "weaveworksdemos/payment:0.4.3",
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const paymentService = new k8s.core.v1.Service("payment", {
    metadata: {
        name: "payment",
        labels: {
            name: "payment",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: payment.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Queue microservice.
// --------------------------------------------------------------------------

const queueMaster = new k8s.apps.v1.Deployment("queue-master", {
    metadata: {
        name: "queue-master",
        labels: {
            name: "queue-master",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "queue-master",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "queue-master",
                },
            },
            spec: {
                containers: [
                    {
                        name: "queue-master",
                        image: "weaveworksdemos/queue-master:0.3.1",
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const queueMasterService = new k8s.core.v1.Service("queue-master", {
    metadata: {
        name: "queue-master",
        labels: {
            name: "queue-master",
        },
        annotations: {
            "prometheus.io/path": "/prometheus",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: queueMaster.spec.template.metadata.labels,
    },
});

const rabbitmq = new k8s.apps.v1.Deployment("rabbitmq", {
    metadata: {
        name: "rabbitmq",
        labels: {
            name: "rabbitmq",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "rabbitmq",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "rabbitmq",
                },
            },
            spec: {
                containers: [
                    {
                        name: "rabbitmq",
                        image: "rabbitmq:3.6.8",
                        ports: [
                            {
                                containerPort: 5672,
                            },
                        ],
                        securityContext: {
                            capabilities: {
                                drop: ["all"],
                                add: ["CHOWN", "SETGID", "SETUID", "DAC_OVERRIDE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const rabbitmqService = new k8s.core.v1.Service("rabbitmq", {
    metadata: {
        name: "rabbitmq",
        labels: {
            name: "rabbitmq",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 5672,
                targetPort: 5672,
            },
        ],
        selector: rabbitmq.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// Shipping microservice.
// --------------------------------------------------------------------------

const shipping = new k8s.apps.v1.Deployment("shipping", {
    metadata: {
        name: "shipping",
        labels: {
            name: "shipping",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "shipping",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "shipping",
                },
            },
            spec: {
                containers: [
                    {
                        name: "shipping",
                        image: "weaveworksdemos/shipping:0.4.8",
                        env: [
                            {
                                name: "ZIPKIN",
                                value: "zipkin.jaeger.svc.cluster.local",
                            },
                            {
                                name: "JAVA_OPTS",
                                value:
                                    "-Xms64m -Xmx128m -XX:PermSize=32m -XX:MaxPermSize=64m -XX:+UseG1GC -Djava.security.egd=file:/dev/urandom",
                            },
                        ],
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const shippingService = new k8s.core.v1.Service("shipping", {
    metadata: {
        name: "shipping",
        labels: {
            name: "shipping",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: shipping.spec.template.metadata.labels,
    },
});

// --------------------------------------------------------------------------
// User microservice.
// --------------------------------------------------------------------------

const userDb = new k8s.apps.v1.Deployment("user-db", {
    metadata: {
        name: "user-db",
        labels: {
            name: "user-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "user-db",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "user-db",
                },
            },
            spec: {
                containers: [
                    {
                        name: "user-db",
                        image: "weaveworksdemos/user-db:0.4.0",
                        ports: [
                            {
                                name: "mongo",
                                containerPort: 27017,
                            },
                        ],
                        securityContext: {
                            capabilities: {
                                drop: ["all"],
                                add: ["CHOWN", "SETGID", "SETUID"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                        volumeMounts: [
                            {
                                mountPath: "/tmp",
                                name: "tmp-volume",
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "tmp-volume",
                        emptyDir: {
                            medium: "Memory",
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const userDbService = new k8s.core.v1.Service("user-db", {
    metadata: {
        name: "user-db",
        labels: {
            name: "user-db",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 27017,
                targetPort: 27017,
            },
        ],
        selector: userDb.spec.template.metadata.labels,
    },
});

const user = new k8s.apps.v1.Deployment("user", {
    metadata: {
        name: "user",
        labels: {
            name: "user",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                name: "user",
            },
        },
        template: {
            metadata: {
                labels: {
                    name: "user",
                },
            },
            spec: {
                containers: [
                    {
                        name: "user",
                        image: "weaveworksdemos/user:0.4.7",
                        ports: [
                            {
                                containerPort: 80,
                            },
                        ],
                        env: [
                            {
                                name: "MONGO_HOST",
                                value: "user-db:27017",
                            },
                        ],
                        securityContext: {
                            runAsNonRoot: true,
                            runAsUser: 10001,
                            capabilities: {
                                drop: ["all"],
                                add: ["NET_BIND_SERVICE"],
                            },
                            readOnlyRootFilesystem: true,
                        },
                    },
                ],
                nodeSelector: {
                    "beta.kubernetes.io/os": "linux",
                },
            },
        },
    },
});

const userService = new k8s.core.v1.Service("user", {
    metadata: {
        name: "user",
        labels: {
            name: "user",
        },
        namespace: sockShopNs.metadata.name,
    },
    spec: {
        ports: [
            {
                port: 80,
                targetPort: 80,
            },
        ],
        selector: user.spec.template.metadata.labels,
    },
});
