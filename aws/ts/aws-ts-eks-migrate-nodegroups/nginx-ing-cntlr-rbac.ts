// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Create a ServiceAccount.
interface NginxServiceAccountArgs {
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeNginxServiceAccount(
    name: string,
    args: NginxServiceAccountArgs,
): k8s.core.v1.ServiceAccount {
    return new k8s.core.v1.ServiceAccount(
        name,
        {
            metadata: {
                namespace: args.namespace,
            },
        },
        {
            provider: args.provider,
        },
    );
}

// Create a ClusterRole.
interface NginxClusterRoleArgs {
    provider: k8s.Provider;
}
export function makeNginxClusterRole(
    name: string,
    args: NginxClusterRoleArgs,
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
                    // TODO(metral): change to k8s.networking.v1beta.Ingress
                    // when EKS supports >= 1.14.
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
                    // TODO(metral): change to k8s.networking.v1beta.Ingress
                    // when EKS supports >= 1.14.
                    apiGroups: ["extensions"],
                    resources: ["ingresses/status"],
                    verbs: ["update"],
                },
            ],
        },
        {
            provider: args.provider,
        },
    );
}

// Create a ClusterRoleBinding of the ServiceAccount -> ClusterRole.
interface NginxClusterRoleBindingArgs {
    namespace: pulumi.Input<string>;
    serviceAccountName: pulumi.Input<string>;
    clusterRoleName: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeNginxClusterRoleBinding(
    name: string,
    args: NginxClusterRoleBindingArgs,
): k8s.rbac.v1.ClusterRoleBinding {
    return new k8s.rbac.v1.ClusterRoleBinding(
        name,
        {
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: args.serviceAccountName,
                    namespace: args.namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: args.clusterRoleName,
            },
        },
        {
            provider: args.provider,
        },
    );
}

// Create a Role.
interface NginxRoleArgs {
    namespace: pulumi.Input<string>;
    ingressClass: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeNginxRole(
    name: string,
    args: NginxRoleArgs,
): k8s.rbac.v1.Role {
    return new k8s.rbac.v1.Role(
        name,
        {
            metadata: {
                namespace: args.namespace,
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
                    resourceNames: ["ingress-controller-leader-" + args.ingressClass],
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
            provider: args.provider,
        },
    );
}

// Create a RoleBinding of the ServiceAccount -> Role.
interface NginxRoleBindingArgs {
    namespace: pulumi.Input<string>;
    serviceAccountName: pulumi.Input<string>;
    roleName: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function makeNginxRoleBinding(
    name: string,
    args: NginxRoleBindingArgs,
): k8s.rbac.v1.RoleBinding {
    return new k8s.rbac.v1.RoleBinding(
        name,
        {
            metadata: {
                namespace: args.namespace,
            },
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: args.serviceAccountName,
                    namespace: args.namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "Role",
                name: args.roleName,
            },
        },
        {
            provider: args.provider,
        },
    );
}
