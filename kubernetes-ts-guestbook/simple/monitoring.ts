import * as k8s from "@pulumi/kubernetes";

export const monitoringNamespace = new k8s.core.v1.Namespace("monitoring", {
    metadata: {
        name: "monitoring",
    },
});

export const monitoringRelease = new k8s.helm.v3.Release("kube-prometheus-stack", {
    chart: "kube-prometheus-stack",
    version: "87.5.0",
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },

    namespace: monitoringNamespace.metadata.name,

    values: {
        grafana: {
            service: {
                type: "NodePort",
            },
            adminPassword: "admin123",
        },

        prometheus: {
            prometheusSpec: {
                serviceMonitorSelectorNilUsesHelmValues: false,
            },
        },
        prometheusOperator: {
            admissionWebhooks: {
                enabled: false,
            },
        },
    },
});
