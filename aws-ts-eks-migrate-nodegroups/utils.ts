import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

// Creates an EKS NodeGroup.
export function createNodeGroup(
    name: string,
    ami: string,
    instanceType: pulumi.Input<aws.ec2.InstanceType>,
    desiredCapacity: pulumi.Input<number>,
    cluster: eks.Cluster,
    instanceProfile: aws.iam.InstanceProfile,
    taints?: pulumi.Input<any>,
): eks.NodeGroup {
    return new eks.NodeGroup(name, {
        cluster: cluster,
        nodeSecurityGroup: cluster.nodeSecurityGroup,
        clusterIngressRule: cluster.eksClusterIngressRule,
        instanceType: instanceType,
        amiId: ami,
        nodeAssociatePublicIpAddress: false,
        desiredCapacity: desiredCapacity,
        minSize: desiredCapacity,
        maxSize: 10,
        instanceProfile: instanceProfile,
        labels: {"amiId": ami},
        taints: taints,
        cloudFormationTags: { "myCloudFormationTag": "true" },
        // Example tags if we were to run cluster-autoscaler: https://git.io/fjwWc
        autoScalingGroupTags: cluster.core.cluster.name.apply(clusterName => ({
            "k8s.io/cluster-autoscaler/enabled": "true",
            [`k8s.io/cluster-autoscaler/${clusterName}`]: "true",
        })),
    }, {
        providers: { kubernetes: cluster.provider},
    });
}
