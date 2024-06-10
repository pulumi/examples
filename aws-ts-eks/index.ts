// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const provider = new aws.Provider("provider", {"region": "us-west-2"});

pulumi.runtime.registerStackTransform((args) => {
    if (args.type.startsWith("aws:")) {
	args.opts.provider = provider;
    }
    return { props: args.props, opts: args.opts };
});

// Create a VPC for our cluster.
const vpc = new awsx.ec2.Vpc("vpc", { numberOfAvailabilityZones: 2 });
// Create the EKS cluster itself and a deployment of the Kubernetes dashboard.
const cluster = new eks.Cluster("cluster", {
	vpcId: vpc.vpcId,
	subnetIds: vpc.publicSubnetIds,
	instanceType: "t2.medium",
	desiredCapacity: 2,
	minSize: 1,
	maxSize: 2,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
