// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

export const classicVpcType = "awsx:x:ec2:Vpc";
export const modernVpcType = "awsx:ec2:Vpc";

const classicSubnetType = "awsx:x:ec2:Subnet";
const classicInternetGatewayType = "awsx:x:ec2:InternetGateway";
const awsVpcType = "aws:ec2/vpc:Vpc";
const awsSubnetType = "aws:ec2/subnet:Subnet";
const awsRouteTableType = "aws:ec2/routeTable:RouteTable";
const awsRouteTableAssociationType = "aws:ec2/routeTableAssociation:RouteTableAssociation";
const awsInternetGatewayType = "aws:ec2/internetGateway:InternetGateway";

const vpcName = "vpc";
const classicSubnetName = "vpc-isolated-0";
const modernSubnetName = "vpc-isolated-1";

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

export const migrateClassicVpc: pulumi.StateMigration = (args) => {
  if (args.oldState.length === 0) {
    return undefined;
  }

  const oldRoot = args.oldState[0];
  if (oldRoot.type === modernVpcType || oldRoot.type === awsVpcType) {
    return undefined;
  }
  if (oldRoot.type !== classicVpcType) {
    throw new Error(`expected a ${classicVpcType} root, found ${JSON.stringify(oldRoot.type)}`);
  }

  const oldRootUrn = resourceUrn(oldRoot);
  const oldVpc = requireResource(args.oldState, awsVpcType, vpcName, oldRootUrn);
  const oldSubnetComponent = requireResource(args.oldState, classicSubnetType, classicSubnetName, oldRootUrn);
  const oldSubnetComponentUrn = resourceUrn(oldSubnetComponent);
  const oldSubnet = requireResource(args.oldState, awsSubnetType, classicSubnetName, oldSubnetComponentUrn);
  const oldRouteTable = requireResource(args.oldState, awsRouteTableType, classicSubnetName, oldSubnetComponentUrn);
  const oldRouteTableAssociation = requireResource(
    args.oldState,
    awsRouteTableAssociationType,
    classicSubnetName,
    oldSubnetComponentUrn,
  );
  const oldInternetGatewayComponent = requireResource(args.oldState, classicInternetGatewayType, vpcName, oldRootUrn);
  const oldInternetGateway = requireResource(
    args.oldState,
    awsInternetGatewayType,
    vpcName,
    resourceUrn(oldInternetGatewayComponent),
  );
  // Preserve stack, project, parent qualification, and name while targeting this stage's schema.
  const rootParts = oldRootUrn.split("::");
  rootParts[2] = rootParts[2].slice(0, rootParts[2].lastIndexOf("$") + 1) + modernVpcType;
  const newRootUrn = rootParts.join("::");
  const newVpcUrn = childUrn(newRootUrn, awsVpcType, vpcName);
  const newSubnetUrn = childUrn(newVpcUrn, awsSubnetType, modernSubnetName);
  const newRouteTableUrn = childUrn(newSubnetUrn, awsRouteTableType, modernSubnetName);
  const newRouteTableAssociationUrn = childUrn(newRouteTableUrn, awsRouteTableAssociationType, modernSubnetName);
  const newInternetGatewayUrn = childUrn(newVpcUrn, awsInternetGatewayType, vpcName);
  const urnMap = new Map<string, string>([
    [oldRootUrn, newRootUrn],
    [resourceUrn(oldVpc), newVpcUrn],
    [oldSubnetComponentUrn, newSubnetUrn],
    [resourceUrn(oldSubnet), newSubnetUrn],
    [resourceUrn(oldRouteTable), newRouteTableUrn],
    [resourceUrn(oldRouteTableAssociation), newRouteTableAssociationUrn],
    [resourceUrn(oldInternetGatewayComponent), newInternetGatewayUrn],
    [resourceUrn(oldInternetGateway), newInternetGatewayUrn],
  ]);

  const newRoot = rename(oldRoot, newRootUrn, typeof oldRoot.parent === "string" ? oldRoot.parent : undefined);
  const newVpc = rename(oldVpc, newVpcUrn, newRootUrn);
  const newSubnet = rename(oldSubnet, newSubnetUrn, newVpcUrn);
  const newRouteTable = rename(oldRouteTable, newRouteTableUrn, newSubnetUrn);
  const newRouteTableAssociation = rename(oldRouteTableAssociation, newRouteTableAssociationUrn, newRouteTableUrn);
  const newInternetGateway = rename(oldInternetGateway, newInternetGatewayUrn, newVpcUrn);

  // The engine uses successors to rewrite references to renamed and folded resources.
  return {
    newState: [newRoot, newVpc, newSubnet, newRouteTable, newRouteTableAssociation, newInternetGateway],
    successors: Object.fromEntries(urnMap),
  };
};
