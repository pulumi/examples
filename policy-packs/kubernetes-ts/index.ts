// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import { EnforcementLevel, PolicyPack, ResourceValidationPolicy, validateResourceOfType } from "@pulumi/policy";

const policies = new PolicyPack("kubernetes", {
    policies: [
        noPublicServices("mandatory"),
        minimumReplicaCount("mandatory"),
        podsAreProhibited("advisory"),
    ],
});

function noPublicServices(enforcementLevel: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "no-public-services",
        description: "Kubernetes Services should be cluster-private",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(k8s.core.v1.Service, (svc, _, reportViolation) => {
            if (svc.spec?.type === "LoadBalancer") {
                reportViolation(`Kubernetes Services that have .type === "LoadBalancer" are exposed to ` +
                    `anything that can reach the Kubernetes cluster, likely including the ` +
                    `public Internet. The security team has disallowed this to prevent ` +
                    `unauthorized access.`);
            }
        }),
    };
}

function minimumReplicaCount(enforcementLevel: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "minimum-replica-count",
        description: "Checks that Kubernetes Deployments and ReplicaSets have at least three replicas.",
        enforcementLevel: enforcementLevel,
        validateResource: [
            validateResourceOfType(k8s.apps.v1.Deployment, (deployment, _, reportViolation) => {
                if (!deployment.spec || !deployment.spec.replicas || deployment.spec.replicas < 3) {
                    reportViolation("Kubernetes Deployments should have at least three replicas.");
                }
            }),
            validateResourceOfType(k8s.apps.v1.ReplicaSet, (replicaSet, _, reportViolation) => {
                if (!replicaSet.spec || !replicaSet.spec.replicas || replicaSet.spec.replicas < 3) {
                    reportViolation("Kubernetes ReplicaSet should have at least three replicas.");
                }
            }),
        ],
    };
}

function podsAreProhibited(enforcementLevel: EnforcementLevel): ResourceValidationPolicy {
    return {
        name: "pods-are-prohibited",
        description: "Checks that Kubernetes Pods are not being used directly.",
        enforcementLevel: enforcementLevel,
        validateResource: validateResourceOfType(k8s.core.v1.Pod, (_, __, reportViolation) => {
            reportViolation("Kubernetes Pods should not be used directly. " +
                "Instead, you may want to use a Deployment, ReplicaSet or Job.");
        }),
    };
}
