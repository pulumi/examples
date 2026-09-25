// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { vpcMigrationAliases, vpcStateMigrations } from "./migration";

const availabilityZone = new pulumi.Config().require("availabilityZone");

const vpcTags = {
  Name: "vpc",
  example: "awsx-vpc-state-migration",
};

const subnetTags = {
  Name: "vpc-isolated-1",
  SubnetType: "Isolated",
  example: "awsx-vpc-state-migration",
};

const vpc = new aws.ec2.Vpc(
  "vpc",
  {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    instanceTenancy: "default",
    tags: vpcTags,
  },
  {
    aliases: vpcMigrationAliases,
    stateMigrations: vpcStateMigrations,
  },
);

const isolatedSubnet = new aws.ec2.Subnet(
  "vpc-isolated-1",
  {
    assignIpv6AddressOnCreation: false,
    availabilityZone: availabilityZone,
    cidrBlock: "10.0.0.0/24",
    mapPublicIpOnLaunch: false,
    tags: subnetTags,
    vpcId: vpc.id,
  },
  { parent: vpc },
);

const routeTable = new aws.ec2.RouteTable(
  "vpc-isolated-1",
  {
    tags: subnetTags,
    vpcId: vpc.id,
  },
  { parent: isolatedSubnet },
);

new aws.ec2.RouteTableAssociation(
  "vpc-isolated-1",
  {
    routeTableId: routeTable.id,
    subnetId: isolatedSubnet.id,
  },
  { parent: routeTable },
);

new aws.ec2.InternetGateway(
  "vpc",
  {
    tags: vpcTags,
    vpcId: vpc.id,
  },
  { parent: vpc },
);

const databaseSecurityGroup = new aws.ec2.SecurityGroup("database", {
  description: "Database resources that must keep using the existing VPC",
  vpcId: vpc.id,
  tags: {
    Name: "database",
    example: "awsx-vpc-state-migration",
  },
});

export const vpcId = vpc.id;
export const isolatedSubnetIds = [isolatedSubnet.id];
export const databaseSecurityGroupId = databaseSecurityGroup.id;
