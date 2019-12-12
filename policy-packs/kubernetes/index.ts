// Copyright 2016-2019, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as k8s from "@pulumi/kubernetes";
import { EnforcementLevel, PolicyPack, ResourceValidationPolicy, validateTypedResource } from "@pulumi/policy";

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
        validateResource: validateTypedResource(k8s.core.v1.Service, (svc, _, reportViolation) => {
            if (svc.spec && svc.spec.type === "LoadBalancer") {
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
            validateTypedResource(k8s.apps.v1.Deployment, (deployment, _, reportViolation) => {
                if (deployment.spec === undefined
                    || deployment.spec.replicas === undefined
                    || deployment.spec.replicas < 3) {
                    reportViolation("Kubernetes Deployments should have at least three replicas.");
                }
            }),
            validateTypedResource(k8s.apps.v1.ReplicaSet, (replicaSet, _, reportViolation) => {
                if (replicaSet.spec === undefined
                    || replicaSet.spec.replicas === undefined
                    || replicaSet.spec.replicas < 3) {
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
        validateResource: validateTypedResource(k8s.core.v1.Pod, (_, __, reportViolation) => {
            reportViolation("Kubernetes Pods should not be used directly. " +
                "Instead, you may want to use a Deployment, ReplicaSet or Job.");
        }),
    };
}
