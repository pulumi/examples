// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx"; import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as echoserver from "./echoserver";
import * as iam from "./iam";
import * as nginx from "./nginx";
import * as utils from "./utils";

const projectName = pulumi.getProject();

// Allocate a new VPC with custom settings, and a public & private subnet per AZ.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    subnetSpecs: [
        { type: awsx.ec2.SubnetType.Public },
        { type: awsx.ec2.SubnetType.Private },
    ],
});

// Export VPC ID and Subnets.
export const vpcId = vpc.vpcId;
export const allVpcSubnets = pulumi.all([vpc.privateSubnetIds, vpc.publicSubnetIds])
                            .apply(([privateSubnetIds, publicSubnetIds]) => privateSubnetIds.concat(publicSubnetIds));

// Create 3 IAM Roles and matching InstanceProfiles to use with the nodegroups.
const roles = iam.createRoles(projectName, 3);
const instanceProfiles = iam.createInstanceProfiles(projectName, roles);

// Create an EKS cluster.
const myCluster = new eks.Cluster(`${projectName}`, {
    version: "1.13",
    vpcId: vpcId,
    subnetIds: allVpcSubnets,
    nodeAssociatePublicIpAddress: false,
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: roles,
    enabledClusterLogTypes: ["api", "audit", "authenticator",
        "controllerManager", "scheduler"],
});
export const kubeconfig = myCluster.kubeconfig;
export const clusterName = myCluster.core.cluster.name;

// Create a Standard node group of t2.medium workers.
const ngStandard = utils.createNodeGroup(`${projectName}-ng-standard`, {
    ami: "ami-03a55127c613349a7", // k8s v1.13.7 in us-west-2
    instanceType: "t2.medium",
    desiredCapacity: 3,
    cluster: myCluster,
    instanceProfile: instanceProfiles[0],
});

// Create a 2xlarge node group of t3.2xlarge workers with taints on the nodes
// dedicated for the NGINX Ingress Controller.
const ng2xlarge = utils.createNodeGroup(`${projectName}-ng-2xlarge`, {
    ami: "ami-0355c210cb3f58aa2", // k8s v1.12.7 in us-west-2
    instanceType: "t3.2xlarge",
    desiredCapacity: 3,
    cluster: myCluster,
    instanceProfile: instanceProfiles[1],
    taints: {"nginx": { value: "true", effect: "NoSchedule"}},
});

// Create a Namespace for NGINX Ingress Controller and the echoserver workload.
const namespace = new k8s.core.v1.Namespace("apps", undefined, { provider: myCluster.provider });
export const namespaceName = namespace.metadata.name;

// Deploy the NGINX Ingress Controller on the specified node group.
const image: string = "quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.25.0";
const ingressClass: string = "my-nginx-class";
const nginxService = nginx.create("nginx-ing-cntlr", {
    image: image,
    replicas: 3,
    namespace: namespaceName,
    ingressClass: ingressClass,
    provider: myCluster.provider,
    nodeSelectorTermValues: ["t3.2xlarge"],
});
export const nginxServiceUrl = nginxService.status.loadBalancer.ingress[0].hostname;

// Deploy the echoserver Workload on the Standard node group.
const echoserverDeployment = echoserver.create("echoserver", {
    replicas: 3,
    namespace: namespaceName,
    ingressClass: ingressClass,
    provider: myCluster.provider,
});
