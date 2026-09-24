// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as assert from "node:assert/strict";
import { childUrn, classicVpcType, migrateClassicVpc, modernVpcType } from "./migration";
import { test } from "node:test";

const awsVpcType = "aws:ec2/vpc:Vpc";
const classicSubnetType = "awsx:x:ec2:Subnet";
const awsSubnetType = "aws:ec2/subnet:Subnet";
const awsRouteTableType = "aws:ec2/routeTable:RouteTable";
const awsRouteTableAssociationType = "aws:ec2/routeTableAssociation:RouteTableAssociation";
const classicInternetGatewayType = "awsx:x:ec2:InternetGateway";
const awsInternetGatewayType = "aws:ec2/internetGateway:InternetGateway";

function state(urn: string, type: string, parent?: string, id?: string): Record<string, any> {
  const result: Record<string, any> = {
    urn,
    type,
    custom: id !== undefined,
    inputs: {},
    outputs: {},
  };
  if (parent !== undefined) {
    result.parent = parent;
  }
  if (id !== undefined) {
    result.id = id;
  }
  return result;
}

test("rewrites the classic VPC shape", async () => {
  const oldRootUrn = "urn:pulumi:dev::awsx-vpc-state-migration::awsx:x:ec2:Vpc::vpc";
  const newRootUrn = "urn:pulumi:dev::awsx-vpc-state-migration::awsx:ec2:Vpc::vpc";
  const oldVpcUrn = childUrn(oldRootUrn, awsVpcType, "vpc");
  const oldSubnetComponentUrn = childUrn(oldRootUrn, classicSubnetType, "vpc-isolated-0");
  const oldSubnetUrn = childUrn(oldSubnetComponentUrn, awsSubnetType, "vpc-isolated-0");
  const oldRouteTableUrn = childUrn(oldSubnetComponentUrn, awsRouteTableType, "vpc-isolated-0");
  const oldAssociationUrn = childUrn(oldSubnetComponentUrn, awsRouteTableAssociationType, "vpc-isolated-0");
  const oldInternetGatewayComponentUrn = childUrn(oldRootUrn, classicInternetGatewayType, "vpc");
  const oldInternetGatewayUrn = childUrn(oldInternetGatewayComponentUrn, awsInternetGatewayType, "vpc");
  const oldState = [
    state(oldRootUrn, classicVpcType),
    state(oldVpcUrn, awsVpcType, oldRootUrn, "vpc-123"),
    state(oldSubnetComponentUrn, classicSubnetType, oldRootUrn),
    state(oldSubnetUrn, awsSubnetType, oldSubnetComponentUrn, "subnet-123"),
    state(oldRouteTableUrn, awsRouteTableType, oldSubnetComponentUrn, "rtb-123"),
    state(oldAssociationUrn, awsRouteTableAssociationType, oldSubnetComponentUrn, "rtbassoc-123"),
    state(oldInternetGatewayComponentUrn, classicInternetGatewayType, oldRootUrn),
    state(oldInternetGatewayUrn, awsInternetGatewayType, oldInternetGatewayComponentUrn, "igw-123"),
  ];

  const result = await migrateClassicVpc({ urn: newRootUrn, oldState });
  assert.ok(result);

  const byUrn = new Map(result.newState.map((resource) => [resource.urn, resource]));
  const newVpcUrn = childUrn(newRootUrn, awsVpcType, "vpc");
  const newSubnetUrn = childUrn(newVpcUrn, awsSubnetType, "vpc-isolated-1");
  const newRouteTableUrn = childUrn(newSubnetUrn, awsRouteTableType, "vpc-isolated-1");
  const newAssociationUrn = childUrn(newRouteTableUrn, awsRouteTableAssociationType, "vpc-isolated-1");
  const newInternetGatewayUrn = childUrn(newVpcUrn, awsInternetGatewayType, "vpc");

  assert.deepEqual(
    new Set(byUrn.keys()),
    new Set([newRootUrn, newVpcUrn, newSubnetUrn, newRouteTableUrn, newAssociationUrn, newInternetGatewayUrn]),
  );
  assert.equal(byUrn.get(newVpcUrn)?.id, "vpc-123");
  assert.equal(byUrn.get(newSubnetUrn)?.id, "subnet-123");
  assert.equal(byUrn.get(newSubnetUrn)?.parent, newVpcUrn);
  assert.equal(byUrn.get(newRouteTableUrn)?.parent, newSubnetUrn);
  assert.equal(byUrn.get(newAssociationUrn)?.parent, newRouteTableUrn);
  assert.equal(result.successors?.[oldRootUrn], newRootUrn);
  assert.equal(result.successors?.[oldVpcUrn], newVpcUrn);
  assert.equal(result.successors?.[oldSubnetComponentUrn], newSubnetUrn);
  assert.equal(result.successors?.[oldInternetGatewayComponentUrn], newInternetGatewayUrn);
});

test("leaves modern state unchanged", async () => {
  const urn = "urn:pulumi:dev::awsx-vpc-state-migration::awsx:ec2:Vpc::vpc";
  assert.equal(await migrateClassicVpc({ urn, oldState: [state(urn, modernVpcType)] }), undefined);
});
