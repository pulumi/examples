// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const availabilityZone = new pulumi.Config().require("availabilityZone");

const vpcTags = {
  Name: "vpc",
  example: "awsx-vpc-state-migration",
};

const vpc = new awsx.classic.ec2.Vpc("vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  instanceTenancy: "default",
  numberOfNatGateways: 0,
  requestedAvailabilityZones: [availabilityZone],
  subnets: [{
    type: "isolated",
    cidrMask: 24,
    tags: {
      ...vpcTags,
      Name: "vpc-isolated-1",
      SubnetType: "Isolated",
    },
  }],
  tags: vpcTags,
});

const databaseSecurityGroup = new aws.ec2.SecurityGroup("database", {
  description: "Database resources that must keep using the existing VPC",
  vpcId: vpc.id,
  tags: {
    Name: "database",
    example: "awsx-vpc-state-migration",
  },
});

export const vpcId = vpc.id;
export const isolatedSubnetIds = vpc.isolatedSubnetIds;
export const databaseSecurityGroupId = databaseSecurityGroup.id;
