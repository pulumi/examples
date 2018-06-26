import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * The Dashboard component creates a deployment of the Kubernetes Dashboard using the best practices listed at
 * https://docs.aws.amazon.com/eks/latest/userguide/dashboard-tutorial.html.
 */
export class Dashboard extends pulumi.ComponentResource {
    /**
     * Creates an instance of the Dashboard component.
     *
     * @param name The _unique_ name of the component.
     * @param opts A bag of options that control the behavior of this component and its children.
     */
    constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
        super("Dashboard", name, {}, opts);

        // Create the dashboard secret
        const dashboard = new k8s.core.v1.Secret("dashboard-certs", {
            metadata: {
                labels: { "k8s-app": "kubernetes-dashboard" },
                name: "kubernetes-dashboard-certs",
                namespace: "kube-system",
            },
            type: "Opaque",
        }, { parent: this });

        // Create the dashboard service account
        const dashboardAccount = new k8s.core.v1.ServiceAccount("kubernetes-dashboard", {
            metadata: {
                labels: { "k8s-app": "kubernetes-dashboard" },
                name: "kubernetes-dashboard",
                namespace: "kube-system",
            },
        }, { parent: this });

        // Dashboard role and role binding
        const dashboardRole = new k8s.rbac.v1.Role("kubernetes-dashboard-minimal", {
            metadata: {
                name: "kubernetes-dashboard-minimal",
                namespace: "kube-system",
            },
            rules: [
                {
                    // Allow Dashboard to create 'kubernetes-dashboard-key-holder' secret.
                    apiGroups: [ "" ],
                    resources: [ "secrets" ],
                    verbs: [ "create" ],
                },
                {
                    // Allow Dashboard to create 'kubernetes-dashboard-settings' config map.
                    apiGroups: [ "" ],
                    resources: [ "configmaps" ],
                    verbs: [ "create" ],
                },
                {
                    // Allow Dashboard to get, update and delete Dashboard exclusive secrets.
                    apiGroups: [ "" ],
                    resources: [ "secrets" ],
                    resourceNames: [ "kubernetes-dashboard-key-holder", "kubernetes-dashboard-certs" ],
                    verbs: [ "get", "update", "delete" ],
                },
                {
                    // Allow Dashboard to get and update 'kubernetes-dashboard-settings' config map.
                    apiGroups: [ "" ],
                    resources: [ "configmaps" ],
                    resourceNames: [ "kubernetes-dashboard-settings" ],
                    verbs: [ "get", "update" ],
                },
                {
                    // Allow Dashboard to get metrics from heapster.
                    apiGroups: [ "" ],
                    resources: [ "services" ],
                    resourceNames: [ "heapster" ],
                    verbs: [ "proxy" ],
                },
                {
                    apiGroups: [ "" ],
                    resources: [ "services/proxy" ],
                    resourceNames: [ "heapster", "http:heapster:", "https:heapster:" ],
                    verbs: [ "get" ],
                },
            ],
        }, { parent: this });
        const dashboardRoleBinding = new k8s.rbac.v1.RoleBinding("kubernetes-dashboard-minimal", {
            metadata: {
                name: "kubernetes-dashboard-minimal",
                namespace: "kube-system",
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "Role",
                name: "kubernetes-dashboard-minimal",
            },
            subjects: [{
                kind: "ServiceAccount",
                name: "kubernetes-dashboard",
                namespace: "kube-system",
            }],
        }, { parent: this });

        // Dashboard deployment
        const dashboardDeployment = new k8s.apps.v1.Deployment("kubernetes-dashboard", {
            metadata: {
                labels: { "k8s-app": "kubernetes-dashboard" },
                name: "kubernetes-dashboard",
                namespace: "kube-system",
            },
            spec: {
                replicas: 1,
                revisionHistoryLimit: 10,
                selector: {
                    matchLabels: { "k8s-app": "kubernetes-dashboard" }
                },
                template: {
                    metadata: {
                        labels: { "k8s-app": "kubernetes-dashboard" },
                    },
                    spec: {
                        containers: [{
                            name: "kubernetes-dashboard",
                            image: "k8s.gcr.io/kubernetes-dashboard-amd64:v1.8.3",
                            ports: [{
                                containerPort: 8443,
                                protocol: "TCP",
                            }],
                            args: [ "--auto-generate-certificates" ],
                            volumeMounts: [
                                {
                                    name: "kubernetes-dashboard-certs",
                                    mountPath: "/certs",
                                },
                                {
                                    // Create on-disk volume to store exec logs
                                    name: "tmp-volume",
                                    mountPath: "/tmp",
                                },
                            ],
                            livenessProbe: {
                                httpGet: {
                                    scheme: "HTTPS",
                                    path: "/",
                                    port: 8443,
                                },
                                initialDelaySeconds: 30,
                                timeoutSeconds: 30,
                            },
                        }],
                        volumes: [
                            {
                                name: "kubernetes-dashboard-certs",
                                secret: { secretName: "kubernetes-dashboard-certs" },
                            },
                            {
                                name: "tmp-volume",
                                emptyDir: {},
                            },
                        ],
                        serviceAccountName: "kubernetes-dashboard",
                        tolerations: [{
                            key: "node-role.kubernetes.io/master",
                            effect: "NoSchedule",
                        }],
                    },
                },
            },
        }, { parent: this });

        // Dashboard service
        const dashboardService = new k8s.core.v1.Service("kubernetes-dashboard", {
            metadata: {
                labels: { "k8s-app": "kubernetes-dashboard" },
                name: "kubernetes-dashboard",
                namespace: "kube-system",
            },
            spec: {
                ports: [{
                    port: 443,
                    targetPort: 8443,
                }],
                selector: { "k8s-app": "kubernetes-dashboard" },
            },
        }, { parent: this });

        // Heapster service account
        const heapsterAccount = new k8s.core.v1.ServiceAccount("heapster", {
            metadata: {
                name: "heapster",
                namespace: "kube-system",
            },
        }, { parent: this });
 
        // Heapster deployment
        const heapsterDeployment = new k8s.apps.v1beta1.Deployment("kubernetes-heapster", {
            metadata: {
                name: "heapster",
                namespace: "kube-system",
            },
            spec: {
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            "task": "monitoring",
                            "k8s-app": "heapster",
                        },
                    },
                    spec: {
                        containers: [{
                            name: "heapster",
                            image: "k8s.gcr.io/heapster-amd64:v1.5.4",
                            imagePullPolicy: "IfNotPresent",
                            command: [
                                "/heapster",
                                "--source=kubernetes:https://kubernetes.default",
                                "--sink=influxdb:http://monitoring-influxdb.kube-system.svc:8086",
                             ],
                        }],
                        serviceAccountName: "heapster",
                    },
                },
            },
        }, { parent: this });

        // Heapster service
        const heapsterService = new k8s.core.v1.Service("heapster", {
            metadata: {
                labels: {
                    "task": "monitoring",
                    "kubernetes.io/cluster-service": "true",
                    "kubernetes.io/name": "Heapster",
                },
                name: "heapster",
                namespace: "kube-system",
            },
            spec: {
                ports: [{
                    port: 80,
                    targetPort: 8082,
                }],
                selector: { "k8s-app": "heapster" },
            },
        }, { parent: this });

        // influxdb deployment
        const influxdbDeployment = new k8s.apps.v1beta1.Deployment("monitoring-influxdb", {
            metadata: {
                name: "monitoring-influxdb",
                namespace: "kube-system",
            },
            spec: {
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            "task": "monitoring",
                            "k8s-app": "influxdb",
                        },
                    },
                    spec: {
                        containers: [{
                            name: "influxdb",
                            image: "k8s.gcr.io/heapster-influxdb-amd64:v1.5.2",
                            volumeMounts: [{
                                mountPath: "/data",
                                name: "influxdb-storage",
                            }],
                        }],
                        volumes: [{
                            name: "influxdb-storage",
                            emptyDir: {},
                        }],
                    },
                },
            },
        }, { parent: this });

        // influxdb service
        const influxdbService = new k8s.core.v1.Service("monitoring-influxdb", {
            metadata: {
                labels: {
                    "task": "monitoring",
                    "kubernetes.io/cluster-service": "true",
                    "kubernetes.io/name": "monitoring-influxdb",
                },
                name: "monitoring-influxdb",
                namespace: "kube-system",
            },
            spec: {
                ports: [{
                    port: 8086,
                    targetPort: 8086,
                }],
                selector: { "k8s-app": "influxdb" },
            },
        }, { parent: this });

        // influxdb role binding
        const influxdbRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("heapster", {
            metadata: {
                name: "heapster",
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: "system:heapster",
            },
            subjects: [{
                kind: "ServiceAccount",
                name: "heapster",
                namespace: "kube-system",
            }],
        }, { parent: this });
    }
}
