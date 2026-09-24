// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

import { classicVpcType, migrateClassicVpc, modernVpcType } from "./classic-migration";

export { modernVpcType };
export const awsVpcType = "aws:ec2/vpc:Vpc";

const awsSubnetType = "aws:ec2/subnet:Subnet";
const awsRouteTableType = "aws:ec2/routeTable:RouteTable";
const awsRouteTableAssociationType = "aws:ec2/routeTableAssociation:RouteTableAssociation";
const awsInternetGatewayType = "aws:ec2/internetGateway:InternetGateway";

const vpcName = "vpc";
const subnetName = "vpc-isolated-1";

type ResourceState = Record<string, any>;

function resourceUrn(resource: ResourceState): string {
  const urn = resource.urn;
  if (typeof urn !== "string" || urn.length === 0) {
    throw new Error(`resource has invalid URN ${JSON.stringify(urn)}`);
  }
  return urn;
}

function resourceName(resource: ResourceState): string {
  const urn = resourceUrn(resource);
  return urn.slice(urn.lastIndexOf("::") + 2);
}

export function childUrn(parentUrn: string, resourceType: string, name: string): string {
  return `${parentUrn.slice(0, parentUrn.lastIndexOf("::"))}$${resourceType}::${name}`;
}

function typeFromUrn(urn: string): string {
  const qualifiedType = urn.split("::")[2];
  return qualifiedType.slice(qualifiedType.lastIndexOf("$") + 1);
}

function requireResource(states: ResourceState[], resourceType: string, name: string, parent: string): ResourceState {
  const matches = states.filter(
    (state) => state.type === resourceType && resourceName(state) === name && state.parent === parent,
  );
  if (matches.length !== 1) {
    throw new Error(`expected one ${resourceType}::${name} below ${parent}, found ${matches.length}`);
  }
  return matches[0];
}

function rename(resource: ResourceState, urn: string, parent: string | undefined): ResourceState {
  const renamed = JSON.parse(JSON.stringify(resource));
  renamed.urn = urn;
  renamed.type = typeFromUrn(urn);
  if (parent === undefined) {
    renamed.parent = undefined;
  } else {
    renamed.parent = parent;
  }
  return renamed;
}

export const migrateAwsxVpc: pulumi.StateMigration = (args) => {
  if (args.oldState.length === 0) {
    return undefined;
  }

  const oldRoot = args.oldState[0];
  if (oldRoot.type === awsVpcType) {
    return undefined;
  }
  if (oldRoot.type !== modernVpcType) {
    throw new Error(`expected a ${modernVpcType} root, found ${JSON.stringify(oldRoot.type)}`);
  }

  const oldRootUrn = resourceUrn(oldRoot);
  const oldVpc = requireResource(args.oldState, awsVpcType, vpcName, oldRootUrn);
  const oldVpcUrn = resourceUrn(oldVpc);
  const oldSubnet = requireResource(args.oldState, awsSubnetType, subnetName, oldVpcUrn);
  const oldSubnetUrn = resourceUrn(oldSubnet);
  const oldRouteTable = requireResource(args.oldState, awsRouteTableType, subnetName, oldSubnetUrn);
  const oldRouteTableUrn = resourceUrn(oldRouteTable);
  const oldRouteTableAssociation = requireResource(
    args.oldState,
    awsRouteTableAssociationType,
    subnetName,
    oldRouteTableUrn,
  );
  const oldInternetGateway = requireResource(args.oldState, awsInternetGatewayType, vpcName, oldVpcUrn);

  const newVpcUrn = args.urn;
  const newSubnetUrn = childUrn(newVpcUrn, awsSubnetType, subnetName);
  const newRouteTableUrn = childUrn(newSubnetUrn, awsRouteTableType, subnetName);
  const newRouteTableAssociationUrn = childUrn(newRouteTableUrn, awsRouteTableAssociationType, subnetName);
  const newInternetGatewayUrn = childUrn(newVpcUrn, awsInternetGatewayType, vpcName);
  const urnMap = new Map<string, string>([
    [oldRootUrn, newVpcUrn],
    [oldVpcUrn, newVpcUrn],
    [oldSubnetUrn, newSubnetUrn],
    [oldRouteTableUrn, newRouteTableUrn],
    [resourceUrn(oldRouteTableAssociation), newRouteTableAssociationUrn],
    [resourceUrn(oldInternetGateway), newInternetGatewayUrn],
  ]);

  const parent = typeof oldRoot.parent === "string" ? oldRoot.parent : undefined;
  const newVpc = rename(oldVpc, newVpcUrn, parent);
  const newSubnet = rename(oldSubnet, newSubnetUrn, newVpcUrn);
  const newRouteTable = rename(oldRouteTable, newRouteTableUrn, newSubnetUrn);
  const newRouteTableAssociation = rename(oldRouteTableAssociation, newRouteTableAssociationUrn, newRouteTableUrn);
  const newInternetGateway = rename(oldInternetGateway, newInternetGatewayUrn, newVpcUrn);

  return {
    newState: [newVpc, newSubnet, newRouteTable, newRouteTableAssociation, newInternetGateway],
    successors: Object.fromEntries(urnMap),
  };
};

// Keep both historical aliases and callbacks so a stack can skip v2.
export const vpcMigrationAliases = [{ type: classicVpcType }, { type: modernVpcType }];
export const vpcStateMigrations: pulumi.StateMigration[] = [migrateClassicVpc, migrateAwsxVpc];
