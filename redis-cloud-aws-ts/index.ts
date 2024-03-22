// Copyright 2016-2023, Pulumi Corporation.  All rights reserved.
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as rediscloud from "@rediscloud/pulumi-rediscloud";

const config = new pulumi.Config();

const region = aws.config.region ?? "";

const getPreferredAz = function () {
  const value = config.get("preferredAz");

  if (region.toLowerCase() !== "us-east-1" && !value) {
    throw new Error("preferredAz must be defined if AWS region is not us-east-1.");
  }

  return value ?? "use1-az1";
};

const preferredAvailabilityZone = getPreferredAz();
const redisVpcCidr = "10.0.0.0/24";

// NOTE: cardType is case-sensitive: "Visa" will work. "visa" will not.
const card = rediscloud.getPaymentMethodOutput({
  cardType: config.require("cardType"),
  lastFourNumbers: config.require("lastFourNumbers"),
});

const subscription = new rediscloud.Subscription("redis-subscription", {
  name: "pulumi-redis-aws-example",
  paymentMethod: "credit-card",
  paymentMethodId: card.id,
  cloudProvider: {
    regions: [
      {
        region: region,
        networkingDeploymentCidr: redisVpcCidr,
        // We use a single AZ here to minimize the cost incurred from running
        // this example:
        multipleAvailabilityZones: false,
        preferredAvailabilityZones: [preferredAvailabilityZone],
      },
    ],
  },

  creationPlan: {
    memoryLimitInGb: 10,
    quantity: 1,
    replication: true,
    supportOssClusterApi: false,
    throughputMeasurementBy: "operations-per-second",
    throughputMeasurementValue: 20000,
    modules: ["RedisJSON"],
  },
});

const database = new rediscloud.SubscriptionDatabase("redis-db", {
  name: "my-db",
  subscriptionId: subscription.id,
  protocol: "redis",
  memoryLimitInGb: 10,
  dataPersistence: "aof-every-1-second",
  throughputMeasurementBy: "operations-per-second",
  throughputMeasurementValue: 20000,
  replication: true,
});

export const privateEndpoint = database.privateEndpoint;
export const publicEndpoint = database.publicEndpoint;

const vpc = new awsx.ec2.Vpc("vpc", {
  cidrBlock: "10.1.0.0/16", // Cannot conflict with the Redis CIDR block,
  natGateways: {
    strategy: "Single",
  },
});

const callerIdentity = aws.getCallerIdentity();

const peering = new rediscloud.SubscriptionPeering("redis-peering", {
  subscriptionId: subscription.id,
  region: region,
  awsAccountId: callerIdentity.then(x => x.accountId),
  vpcId: vpc.vpcId,
  vpcCidr: vpc.vpc.cidrBlock,
});

/* tslint:disable:no-unused-expression */
new aws.ec2.VpcPeeringConnectionAccepter("aws-peering-accepter", {
  vpcPeeringConnectionId: peering.awsPeeringId,
  autoAccept: true,
});

const sg = new aws.ec2.SecurityGroup("instance-sg", {
  description: "Allow all egress traffic.",
  vpcId: vpc.vpcId,
  egress: [{
    cidrBlocks: ["0.0.0.0/0"],
    description: "Allow all",
    protocol: "-1",
    fromPort: 0,
    toPort: 0,
  }],
});

const instanceRole = new aws.iam.Role("instance-role", {
  assumeRolePolicy: JSON.stringify({
    "Version": "2012-10-17",
    "Statement": {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com",
      },
      "Action": "sts:AssumeRole",
    },
  }),
});

new aws.iam.RolePolicyAttachment("instance-role-attachment", {
  role: instanceRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

const instanceProfile = new aws.iam.InstanceProfile("instance-profile", {
  role: instanceRole.name,
});

const amazonLinux2 = aws.ec2.getAmiOutput({
  mostRecent: true,
  owners: ["amazon"],
  filters: [
    { name: "name", values: ["amzn2-ami-hvm-*-x86_64-gp2"] },
    { name: "owner-alias", values: ["amazon"] },
  ],
});

new aws.ec2.Instance("instance", {
  ami: amazonLinux2.id,
  instanceType: "t3.micro",
  vpcSecurityGroupIds: [sg.id],
  subnetId: vpc.privateSubnetIds[0],
  tags: {
    Name: "pulumi-redis-cloud-tester",
  },
  iamInstanceProfile: instanceProfile.name,
  userData: `#!/bin/bash
  sudo amazon-linux-extras install redis6
  `,
});

vpc.privateSubnetIds.apply(ids => {
  ids.forEach((id, index) => {
    const routeTable = aws.ec2.getRouteTableOutput({
      subnetId: id,
    });

    new aws.ec2.Route(`peering-route-${index}`, {
      routeTableId: routeTable.id,
      destinationCidrBlock: redisVpcCidr,
      vpcPeeringConnectionId: peering.awsPeeringId,
    });
  });
});
