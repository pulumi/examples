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

import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as config from "./config";

export class GkeCluster extends pulumi.ComponentResource {
    public cluster: gcp.container.Cluster;
    public kubeconfig: pulumi.Output<string>;
    public provider: k8s.Provider;

    constructor(name: string,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("pulumi-kubernetes:ci:GkeCluster", name, {}, opts);

        // Find the latest engine version.
        const engineVersion = gcp.container.getEngineVersions({
            location: config.gcpLocation,
            project: config.gcpProject,
        }).then(v => v.latestMasterVersion);

        // Create the GKE cluster.
        const k8sCluster = new gcp.container.Cluster("ephemeral-ci-cluster", {
            initialNodeCount: config.nodeCount,
            nodeVersion: engineVersion,
            minMasterVersion: engineVersion,
            masterAuth: {username: config.masterUsername, password: config.masterPassword},
            nodeConfig: {
                machineType: config.nodeMachineType,
                oauthScopes: [
                    "https://www.googleapis.com/auth/compute",
                    "https://www.googleapis.com/auth/devstorage.read_only",
                    "https://www.googleapis.com/auth/logging.write",
                    "https://www.googleapis.com/auth/monitoring"
                ],
            },
            project: config.gcpProject,
            location: config.gcpLocation,
        }, {parent: this});
        this.cluster = k8sCluster;

        // Manufacture a GKE-style Kubeconfig. Note that this is slightly "different" because of the way GKE requires
        // gcloud to be in the picture for cluster authentication (rather than using the client cert/key directly).
        this.kubeconfig = pulumi.all([k8sCluster.name, k8sCluster.endpoint, k8sCluster.masterAuth]).apply(
            ([name, endpoint, auth]) => {
                const context = `${config.gcpProject}_${config.gcpZone}_${name}`;
                return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
            });

        // Export a Kubernetes provider instance that uses our cluster from above.
        this.provider = new k8s.Provider("gke", {kubeconfig: this.kubeconfig}, {parent: this});
    }
}

