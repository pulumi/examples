// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";
import { LandingZone } from "./components/landing-zone";

const config = new pulumi.Config();
const cidrBlock = config.get("cidrBlock");
const trustedPrincipalArn = config.get("trustedPrincipalArn");

const zone = new LandingZone("platform", {
    cidrBlock,
    trustedPrincipalArn,
    tags: {
        Project: "landing-zone",
        Environment: pulumi.getStack(),
    },
});

// Downstream Pulumi projects consume these outputs via a StackReference.
export const networkId = zone.networkId;
export const publicSubnetIds = zone.publicSubnetIds;
export const privateSubnetIds = zone.privateSubnetIds;
export const dataEncryptionKeyArn = zone.dataEncryptionKeyArn;
export const dataEncryptionKeyAlias = zone.dataEncryptionKeyAlias;
export const secretsStore = zone.secretsStore;
export const deployerRoleArn = zone.deployerRoleArn;
export const readOnlyRoleArn = zone.readOnlyRoleArn;
export const auditBucket = zone.auditBucket;
