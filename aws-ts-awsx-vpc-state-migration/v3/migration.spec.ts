// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as assert from "node:assert/strict";
import { awsVpcType, childUrn, migrateAwsxVpc, modernVpcType, vpcMigrationAliases, vpcStateMigrations } from "./migration";
import { classicVpcType, migrateClassicVpc } from "./classic-migration";
import { test } from "node:test";

const awsSubnetType = "aws:ec2/subnet:Subnet";
const awsRouteTableType = "aws:ec2/routeTable:RouteTable";
const awsRouteTableAssociationType = "aws:ec2/routeTableAssociation:RouteTableAssociation";
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

test("rewrites the AWSX VPC as plain AWS resources", async () => {
  const stackUrn = "urn:pulumi:dev::awsx-vpc-state-migration::pulumi:pulumi:Stack::awsx-vpc-state-migration-dev";
  const oldRootUrn = "urn:pulumi:dev::awsx-vpc-state-migration::awsx:ec2:Vpc::vpc";
  const newVpcUrn = "urn:pulumi:dev::awsx-vpc-state-migration::aws:ec2/vpc:Vpc::vpc";
  const oldVpcUrn = childUrn(oldRootUrn, awsVpcType, "vpc");
  const oldSubnetUrn = childUrn(oldVpcUrn, awsSubnetType, "vpc-isolated-1");
  const oldRouteTableUrn = childUrn(oldSubnetUrn, awsRouteTableType, "vpc-isolated-1");
  const oldAssociationUrn = childUrn(oldRouteTableUrn, awsRouteTableAssociationType, "vpc-isolated-1");
  const oldInternetGatewayUrn = childUrn(oldVpcUrn, awsInternetGatewayType, "vpc");
  const oldState = [
    state(oldRootUrn, modernVpcType, stackUrn),
    state(oldVpcUrn, awsVpcType, oldRootUrn, "vpc-123"),
    state(oldSubnetUrn, awsSubnetType, oldVpcUrn, "subnet-123"),
    state(oldRouteTableUrn, awsRouteTableType, oldSubnetUrn, "rtb-123"),
    state(oldAssociationUrn, awsRouteTableAssociationType, oldRouteTableUrn, "rtbassoc-123"),
    state(oldInternetGatewayUrn, awsInternetGatewayType, oldVpcUrn, "igw-123"),
  ];

  const result = await migrateAwsxVpc({ urn: newVpcUrn, oldState });
  assert.ok(result);

  const newSubnetUrn = childUrn(newVpcUrn, awsSubnetType, "vpc-isolated-1");
  const newRouteTableUrn = childUrn(newSubnetUrn, awsRouteTableType, "vpc-isolated-1");
  const newAssociationUrn = childUrn(newRouteTableUrn, awsRouteTableAssociationType, "vpc-isolated-1");
  const newInternetGatewayUrn = childUrn(newVpcUrn, awsInternetGatewayType, "vpc");
  const byUrn = new Map(result.newState.map((resource) => [resource.urn, resource]));

  assert.deepEqual(
    new Set(byUrn.keys()),
    new Set([newVpcUrn, newSubnetUrn, newRouteTableUrn, newAssociationUrn, newInternetGatewayUrn]),
  );
  assert.equal(byUrn.get(newVpcUrn)?.id, "vpc-123");
  assert.equal(byUrn.get(newVpcUrn)?.parent, stackUrn);
  assert.equal(byUrn.get(newSubnetUrn)?.id, "subnet-123");
  assert.equal(byUrn.get(newSubnetUrn)?.parent, newVpcUrn);
  assert.equal(byUrn.get(newRouteTableUrn)?.id, "rtb-123");
  assert.equal(byUrn.get(newRouteTableUrn)?.parent, newSubnetUrn);
  assert.equal(byUrn.get(newAssociationUrn)?.id, "rtbassoc-123");
  assert.equal(byUrn.get(newAssociationUrn)?.parent, newRouteTableUrn);
  assert.equal(byUrn.get(newInternetGatewayUrn)?.id, "igw-123");
  assert.equal(byUrn.get(newInternetGatewayUrn)?.parent, newVpcUrn);
  assert.equal(result.successors?.[oldRootUrn], newVpcUrn);
  assert.equal(result.successors?.[oldVpcUrn], newVpcUrn);
});

test("leaves plain AWS state unchanged", async () => {
  const urn = "urn:pulumi:dev::awsx-vpc-state-migration::aws:ec2/vpc:Vpc::vpc";
  assert.equal(await migrateAwsxVpc({ urn, oldState: [state(urn, awsVpcType, undefined, "vpc-123")] }), undefined);
});

test("supports direct classic-to-plain upgrades with the same state as sequential upgrades", async () => {
  const prefix = "urn:pulumi:dev::awsx-vpc-state-migration::";
  const stack = `${prefix}pulumi:pulumi:Stack::awsx-vpc-state-migration-dev`;
  const classic = `${prefix}${classicVpcType}::vpc`;
  const modern = `${prefix}${modernVpcType}::vpc`;
  const plain = `${prefix}${awsVpcType}::vpc`;
  const subnetWrapperType = "awsx:x:ec2:Subnet";
  const gatewayWrapperType = "awsx:x:ec2:InternetGateway";
  const subnetWrapper = childUrn(classic, subnetWrapperType, "vpc-isolated-0");
  const gatewayWrapper = childUrn(classic, gatewayWrapperType, "vpc");
  const original = [
    state(classic, classicVpcType, stack),
    state(childUrn(classic, awsVpcType, "vpc"), awsVpcType, classic, "vpc-123"),
    state(subnetWrapper, subnetWrapperType, classic),
    state(childUrn(subnetWrapper, awsSubnetType, "vpc-isolated-0"), awsSubnetType, subnetWrapper, "subnet-123"),
    state(
      childUrn(subnetWrapper, awsRouteTableType, "vpc-isolated-0"),
      awsRouteTableType,
      subnetWrapper,
      "rtb-123",
    ),
    state(
      childUrn(subnetWrapper, awsRouteTableAssociationType, "vpc-isolated-0"),
      awsRouteTableAssociationType,
      subnetWrapper,
      "rtbassoc-123",
    ),
    state(gatewayWrapper, gatewayWrapperType, classic),
    state(
      childUrn(gatewayWrapper, awsInternetGatewayType, "vpc"),
      awsInternetGatewayType,
      gatewayWrapper,
      "igw-123",
    ),
  ];
  const before = JSON.stringify(original);
  const v2 = await migrateClassicVpc({ urn: modern, oldState: original });
  assert.ok(v2);
  // A historical stage must not change its destination schema when invoked by the newest registration.
  assert.deepEqual(await migrateClassicVpc({ urn: plain, oldState: original }), v2);
  const sequential = await migrateAwsxVpc({ urn: plain, oldState: v2.newState });
  assert.ok(sequential);

  let direct = original;
  const successors: Record<string, string> = {};
  for (const migration of vpcStateMigrations) {
    // The engine supplies the final registration URN to every stage in a single update.
    const result = await migration({ urn: plain, oldState: direct });
    assert.ok(result);
    direct = result.newState;
    Object.assign(successors, result.successors);
  }
  assert.deepEqual(direct, sequential.newState);
  assert.equal(direct[0].urn, plain);
  assert.equal(direct[0].parent, stack);
  assert.equal(direct.length, 5);
  assert.deepEqual(
    direct.map((s) => [s.type, s.id]),
    original.filter((s) => s.custom).map((s) => [s.type, s.id]),
  );
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(vpcMigrationAliases, [{ type: classicVpcType }, { type: modernVpcType }]);

  // Each original URN has the same final successor as it does after two separate updates.
  for (const old of original) {
    let resolved = old.urn;
    const visited = new Set<string>();
    while (successors[resolved]) {
      assert.ok(!visited.has(resolved), "successor cycle");
      visited.add(resolved);
      resolved = successors[resolved];
    }
    const intermediate: string = v2.successors?.[old.urn] ?? old.urn;
    assert.equal(resolved, sequential.successors?.[intermediate] ?? intermediate);
    assert.ok(direct.some((s) => s.urn === resolved));
  }
  for (const migration of vpcStateMigrations) {
    assert.equal(await migration({ urn: plain, oldState: direct }), undefined);
  }
});

test("rejects an unsupported root instead of silently skipping the upgrade", async () => {
  const type = "example:index:Unexpected";
  const urn = `urn:pulumi:dev::awsx-vpc-state-migration::${type}::vpc`;
  await assert.rejects(async () => {
    for (const migration of vpcStateMigrations) {
      await migration({ urn, oldState: [state(urn, type)] });
    }
  }, /expected a .* root/);
});
