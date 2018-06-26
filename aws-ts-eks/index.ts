import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";
import * as k8s from "@pulumi/kubernetes";

import { EKSCluster } from "./cluster";

const config = new pulumi.Config();
const instanceType = (config.get("instanceType") || "m4.large") as aws.ec2.InstanceType;

// Create a VPC for our cluster.
const network = new awsinfra.Network("eksNetwork");

// Create the EKS cluster itself.
const cluster = new EKSCluster("eksCluster", {
    vpcId: network.vpcId,
    subnetIds: network.subnetIds,
    instanceType: instanceType,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: true,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
