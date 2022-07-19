// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as alicloud from "@pulumi/alicloud";

const exampleRg = new alicloud.resourcemanager.ResourceGroup("pulumiExampleRg", {
    displayName: "Pulumi Example RG",
    resourceGroupName: "pulumiDeployment",
}, {
    protect: false,
});

const exampleVpc = new alicloud.vpc.Network("pulumiExampleVpc", {
    description: "Pulumi Example VPC.",
    resourceGroupId: exampleRg.id,
}, {
    protect: false,
});

const exampleSubnet = new alicloud.vpc.Subnet("pulumiExampleSubnet", {
    zoneId: "us-east-1a",
    cidrBlock: "172.20.112.0/20",
    description: "System created default virtual switch.",
    vpcId: exampleVpc.id,
}, {
    protect: false,
});

const exampleSg = new alicloud.ecs.SecurityGroup("pulumiExampleSg", {
    description: "System created security group.",
    innerAccessPolicy: "Accept",
    name: "pulumiExampleSg",
    vpcId: exampleVpc.id,
}, {
    protect: false,
});

const exampleInstance = new alicloud.ecs.Instance("pulumiExampleInstance", {
    availabilityZone: "us-east-1a",
    creditSpecification: "Standard",
    hostName: "pulumiExampleInstance",
    imageId: "aliyun_3_x64_20G_alibase_20220527.vhd",
    instanceChargeType: "PostPaid",
    instanceName: "pulumiExampleInstance",
    instanceType: "ecs.t6-c2m1.large",
    internetChargeType: "PayByTraffic",
    internetMaxBandwidthOut: 25,
    resourceGroupId: exampleRg.id,
    securityGroups: [exampleSg.id],
    spotStrategy: "NoSpot",
    status: "Running",
    stoppedMode: "StopCharging",
    systemDiskCategory: "cloud_essd",
    systemDiskPerformanceLevel: "PL0",
    tags: {
        company: "pulumi",
    },
    volumeTags: {
        company: "pulumi",
    },
    vswitchId: exampleSubnet.id,
}, {
    protect: false,
});
