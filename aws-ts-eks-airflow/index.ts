import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

const vpc = new awsx.ec2.Vpc("eks-airflow", {
  enableDnsHostnames: true,
});

// We need to explicitly specify this role until
// https://github.com/pulumi/pulumi-eks/issues/833 is resolved:
const instanceRole = new aws.iam.Role("instance-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: { Service: "ec2.amazonaws.com" },
        Effect: "Allow",
      },
    ],
  }),
});

const policyArns = [
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
];

policyArns.forEach((value, index) => new aws.iam.RolePolicyAttachment(`instance-role-policy-${index + 1}`, {
  policyArn: value,
  role: instanceRole.name,
}));

const cluster = new eks.Cluster(
  "eks-airflow", {
  vpcId: vpc.vpcId,
  publicSubnetIds: vpc.publicSubnetIds,
  privateSubnetIds: vpc.privateSubnetIds,
  desiredCapacity: 3,
  instanceType: "t3.medium",
  minSize: 3,
  maxSize: 6,
  nodeAssociatePublicIpAddress: false,
  instanceRole: instanceRole,
});


new aws.eks.Addon("ebs-csi-driver", {
  addonName: "aws-ebs-csi-driver",
  addonVersion: "v1.19.0-eksbuild.2",
  clusterName: cluster.core.cluster.name
});

const k8sProvider = new k8s.Provider("k8s-provider", {
  kubeconfig: cluster.kubeconfig
});


const airflowChart = new k8s.helm.v3.Chart("airflow-chart", {
  fetchOpts: {
    repo: "https://airflow-helm.github.io/charts",
  },
  chart: "airflow"
}, {
  provider: k8sProvider
});

export const kubeconfig = cluster.kubeconfig;
