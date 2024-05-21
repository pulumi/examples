// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const provider = new aws.Provider("provider", {"region": "us-west-2"});
const providerVersioned = new aws.Provider("providerVersioned", {"region": "us-west-2"}, {"version": "6.32.0"});

let cluster: eks.Cluster | undefined;
pulumi.withDefaultProviders([provider, providerVersioned], () => {
	// Create a VPC for our cluster.
	const vpc = new awsx.ec2.Vpc("vpc", { numberOfAvailabilityZones: 2 });

	// Create the EKS cluster itself and a deployment of the Kubernetes dashboard.
	cluster = new eks.Cluster("cluster", {
		vpcId: vpc.vpcId,
		subnetIds: vpc.publicSubnetIds,
		instanceType: "t2.medium",
		desiredCapacity: 2,
		minSize: 1,
		maxSize: 2,
	});
});

// Export the cluster's kubeconfig.
//if (cluster) {
//    export const kubeconfig = cluster.kubeconfig;
//}
