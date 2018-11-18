import { execSync } from "child_process";

import * as k8s from "@pulumi/kubernetes";

import * as config from "./config";
import { k8sProvider } from "./cluster";

const appName = "istio";
const namespace = new k8s.core.v1.Namespace(
    `${appName}-system`,
    { metadata: { name: `${appName}-system` } },
    { provider: k8sProvider }
);

new k8s.rbac.v1.ClusterRoleBinding(
    "cluster-admin-binding",
    {
        metadata: { name: "cluster-admin-binding" },
        roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "cluster-admin"
        },
        subjects: [{ apiGroup: "rbac.authorization.k8s.io", kind: "User", name: config.username }]
    },
    { provider: k8sProvider }
);

export const istio = new k8s.helm.v2.Chart(
    appName,
    {
        repo: "istio",
        chart: "istio",
        namespace: namespace.metadata.apply(m => m.name),
        version: "1.0.1",
        // for all options check https://github.com/istio/istio/tree/master/install/kubernetes/helm/istio
        values: { kiali: { enabled: true } }
    },
    { dependsOn: [namespace], providers: { kubernetes: k8sProvider } }
);

export function kubeInject(path: string): string {
    return execSync(`istioctl kube-inject -f ${path}`).toString();
}
