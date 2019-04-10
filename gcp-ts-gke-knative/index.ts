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
import * as pulumi from "@pulumi/pulumi";
import { k8sProvider } from "./cluster";

const istioDir = "manifests/istio";
const knativeDir = "manifests/knative";

const istioCRDs = new k8s.yaml.ConfigFile("istioCRDs", {
    file: `${istioDir}/istio-crds.yaml`
}, {providers: {kubernetes: k8sProvider}});

const istioCRD = istioCRDs.getResource(
    "apiextensions.k8s.io/v1beta1/CustomResourceDefinition", "handlers.config.istio.io");

const istio = new k8s.yaml.ConfigFile("istio", {
    file: `${istioDir}/istio.yaml`
}, {dependsOn: istioCRD, providers: {kubernetes: k8sProvider}});

const knativeCRDs = new k8s.yaml.ConfigFile("knativeCRDs", {
    file: `${knativeDir}/crds.yaml`
}, {dependsOn: istioCRD, providers: {kubernetes: k8sProvider}});

const knativeCRD = knativeCRDs.getResource(
    "apiextensions.k8s.io/v1beta1/CustomResourceDefinition", "builds.build.knative.dev");

const knative = new k8s.yaml.ConfigGroup("knative", {
    files: [
        `${knativeDir}/build.yaml`,
        `${knativeDir}/clusterrole.yaml`,
        `${knativeDir}/eventing.yaml`,
        `${knativeDir}/eventing-sources.yaml`,
        `${knativeDir}/monitoring.yaml`,
        `${knativeDir}/serving.yaml`,
    ]}, {dependsOn: knativeCRD, providers: {kubernetes: k8sProvider}});

const helloworld = new k8s.apiextensions.CustomResource("hello", {
    apiVersion: "serving.knative.dev/v1alpha1",
    kind: "Service",
    metadata: {
        name: "helloworld-go",
        namespace: "default"
    },
    spec: {
        runLatest: {
            configuration: {
                revisionTemplate: {
                    spec: {
                        container: {
                            image: "gcr.io/knative-samples/helloworld-go",
                            env: [
                                {
                                    name: "TARGET",
                                    value: "Go Sample v1"
                                }
                            ]
                        }
                    }
                }
            }
        }
    }
}, {dependsOn: knativeCRD, provider: k8sProvider});

const helloworld_ip = istio.getResource(
    "v1/Service", "istio-system", "istio-ingressgateway").apply(
        svc => svc.status.loadBalancer.ingress[0].ip);

export const curl_command = pulumi.concat(
    `curl -H 'Host: helloworld-go.default.svc.cluster.local' http://`, helloworld_ip);
