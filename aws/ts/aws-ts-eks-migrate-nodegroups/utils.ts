// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

// Creates an EKS NodeGroup.
interface NodeGroupArgs {
    ami: string;
    instanceType: pulumi.Input<aws.ec2.InstanceType>;
    desiredCapacity: pulumi.Input<number>;
    cluster: eks.Cluster;
    instanceProfile: aws.iam.InstanceProfile;
    taints?: pulumi.Input<any>;
}
export function createNodeGroup(
    name: string,
    args: NodeGroupArgs,
): eks.NodeGroup {
    return new eks.NodeGroup(name, {
        cluster: args.cluster,
        nodeSecurityGroup: args.cluster.nodeSecurityGroup,
        clusterIngressRule: args.cluster.eksClusterIngressRule,
        instanceType: args.instanceType,
        amiId: args.ami,
        nodeAssociatePublicIpAddress: false,
        desiredCapacity: args.desiredCapacity,
        minSize: args.desiredCapacity,
        maxSize: 10,
        instanceProfile: args.instanceProfile,
        labels: {"amiId": args.ami},
        taints: args.taints,
    }, {
        providers: { kubernetes: args.cluster.provider},
    });
}
