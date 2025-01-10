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

import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export class EksCluster extends pulumi.ComponentResource {
    public cluster: eks.Cluster;
    public provider: k8s.Provider;

    constructor(name: string,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:kubernetes-ts-multicloud:EksCluster", name, {}, opts);

        // Create a VPC for our cluster.
        const vpc = new awsx.ec2.Vpc("vpc", {});

        // Create the EKS cluster itself, including a "gp2"-backed StorageClass and a deployment of the Kubernetes dashboard.
        this.cluster = new eks.Cluster("cluster", {
            vpcId: vpc.vpcId,
            subnetIds: vpc.publicSubnetIds,
            instanceType: "t2.medium",
            desiredCapacity: 2,
            minSize: 1,
            maxSize: 2,
            storageClasses: "gp2",
            deployDashboard: false,
        });

        this.provider = this.cluster.provider;
    }
}

