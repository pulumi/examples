// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

import { classicVpcType, migrateClassicVpc } from "./migration";

const availabilityZone = new pulumi.Config().require("availabilityZone");

const vpcTags = {
  Name: "vpc",
  example: "awsx-vpc-state-migration",
};

const vpc = new awsx.ec2.Vpc(
  "vpc",
  {
    availabilityZoneNames: [availabilityZone],
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    instanceTenancy: "default",
    natGateways: {
      strategy: awsx.ec2.NatGatewayStrategy.None,
    },
    subnetStrategy: awsx.ec2.SubnetAllocationStrategy.Legacy,
    subnetSpecs: [
      {
        type: awsx.ec2.SubnetType.Isolated,
        cidrMask: 24,
      },
    ],
    tags: vpcTags,
  },
  {
    aliases: [{ type: classicVpcType }],
    stateMigrations: [migrateClassicVpc],
  },
);

const databaseSecurityGroup = new aws.ec2.SecurityGroup("database", {
  description: "Database resources that must keep using the existing VPC",
  vpcId: vpc.vpcId,
  tags: {
    Name: "database",
    example: "awsx-vpc-state-migration",
  },
});

export const vpcId = vpc.vpcId;
export const isolatedSubnetIds = vpc.isolatedSubnetIds;
export const databaseSecurityGroupId = databaseSecurityGroup.id;
