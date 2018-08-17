import * as awsinfra from "@pulumi/aws-infra";
import * as eks from "@pulumi/eks";

// Create a VPC for our cluster.
const vpc = new awsinfra.Network("vpc");

// Create the EKS cluster itself, including a "gp2"-backed StorageClass and a dpeloyment of the Kubernetes dashboard.
const cluster = new eks.Cluster("cluster", {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    instanceType: "t2.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: true,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
