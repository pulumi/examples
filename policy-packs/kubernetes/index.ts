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
import { PolicyPack, validateTypedResource } from "@pulumi/policy";

const policies = new PolicyPack("kubernetes", {
    policies: [
        {
            name: "no-public-services",
            description: "Kubernetes Services should be cluster-private",
            enforcementLevel: "mandatory",
            validateResource: validateTypedResource(k8s.core.v1.Service.isInstance, (svc, args, reportViolation) => {
                if (svc.spec.type == "LoadBalancer") {
                    reportViolation(`Kubernetes Services that have .type === "LoadBalancer" are exposed to ` +
                        `anything that can reach the Kubernetes cluster, likely including the ` +
                        `public Internet. The security team has disallowed this to prevent ` +
                        `unauthorized access.`);
                }
            }),
        },
    ],
});
