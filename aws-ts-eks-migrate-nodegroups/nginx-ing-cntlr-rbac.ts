import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Create a ServiceAccount.
export function makeNginxServiceAccount(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
): k8s.core.v1.ServiceAccount {
    return new k8s.core.v1.ServiceAccount(
        name,
        {
            metadata: {
                namespace: namespace,
            },
        },
        {
            provider: provider,
        },
    );
}

// Create a ClusterRole.
export function makeNginxClusterRole(
    name: string,
    provider: k8s.Provider,
): k8s.rbac.v1.ClusterRole {
    return new k8s.rbac.v1.ClusterRole(
        name,
        {
            rules: [
                {
                    apiGroups: [""],
                    resources: ["configmaps", "endpoints", "nodes", "pods", "secrets"],
                    verbs: ["list", "watch"],
                },
                {
                    apiGroups: [""],
                    resources: ["nodes"],
                    verbs: ["get"],
                },
                {
                    apiGroups: [""],
                    resources: ["services"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["ingresses"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: [""],
                    resources: ["events"],
                    verbs: ["create", "patch"],
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["ingresses/status"],
                    verbs: ["update"],
                },
            ],
        },
        {
            provider: provider,
        },
    );
}

// Create a ClusterRoleBinding of the ServiceAccount -> ClusterRole.
export function makeNginxClusterRoleBinding(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    clusterRoleName: pulumi.Input<string>,
): k8s.rbac.v1.ClusterRoleBinding {
    return new k8s.rbac.v1.ClusterRoleBinding(
        name,
        {
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: serviceAccountName,
                    namespace: namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: clusterRoleName,
            },
        },
        {
            provider: provider,
        },
    );
}

// Create a Role.
export function makeNginxRole(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    ingressClass: pulumi.Input<string>,
): k8s.rbac.v1.Role {
    return new k8s.rbac.v1.Role(
        name,
        {
            metadata: {
                namespace: namespace,
            },
            rules: [
                {
                    apiGroups: [""],
                    resources: ["configmaps", "pods", "secrets", "namespaces"],
                    verbs: ["get"],
                },
                {
                    apiGroups: [""],
                    resources: ["configmaps"],
                    // Defaults to "<election-id>-<ingress-class>"
                    // In this setup its specifically: "<ingress-controller-leader>-<my-nginx-class>".
                    // This has to be adapted if you change either parameter
                    // (--election-id, and/or --ingress-class) when launching
                    // the nginx-ing-cntlr. See for more info:
                    // https://github.com/kubernetes/ingress/tree/master/docs/deploy/rbac.md#namespace-permissions
                    resourceNames: ["ingress-controller-leader-" + ingressClass],
                    verbs: ["get", "update"],
                },
                {
                    apiGroups: [""],
                    resources: ["configmaps"],
                    verbs: ["create"],
                },
                {
                    apiGroups: [""],
                    resources: ["endpoints"],
                    verbs: ["get", "create", "update"],
                },
            ],
        },
        {
            provider: provider,
        },
    );
}

// Create a RoleBinding of the ServiceAccount -> Role.
export function makeNginxRoleBinding(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    roleName: pulumi.Input<string>,
): k8s.rbac.v1.RoleBinding {
    return new k8s.rbac.v1.RoleBinding(
        name,
        {
            metadata: {
                namespace: namespace,
            },
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: serviceAccountName,
                    namespace: namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "Role",
                name: roleName,
            },
        },
        {
            provider: provider,
        },
    );
}
