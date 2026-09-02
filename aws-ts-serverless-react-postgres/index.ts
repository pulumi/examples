// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";

import { Database } from "./components/database";
import { Edge } from "./components/edge";

const config = new pulumi.Config();
const landingZoneStackName = config.require("landingZoneStack");
const dbEngineVersion = config.get("dbEngineVersion") ?? "16.4";
const functionMemoryMB = config.getNumber("functionMemoryMB") ?? 512;
const websiteDistPath = config.get("websiteDistPath") ?? "./website/dist";
const apiHandlerPath = config.get("apiHandlerPath") ?? "./api/dist";

const landingZone = new pulumi.StackReference(landingZoneStackName);
const vpcId = landingZone.requireOutput("networkId") as pulumi.Output<string>;
const privateSubnetIds = landingZone.requireOutput("privateSubnetIds") as pulumi.Output<string[]>;
const secretsStore = landingZone.requireOutput("secretsStore") as pulumi.Output<string>;

const projectName = `${pulumi.getStack()}-serverless-react-postgres`;
const commonTags: Record<string, string> = {
    Project: "serverless-react-postgres",
    Environment: pulumi.getStack(),
};

const database = new Database("db", {
    vpcId,
    privateSubnetIds,
    secretsStore,
    engineVersion: dbEngineVersion,
    namePrefix: projectName,
    tags: commonTags,
});

const edge = new Edge("edge", {
    databaseSecretArn: database.secretArn,
    databaseSecurityGroupId: database.securityGroupId,
    vpcId,
    privateSubnetIds,
    websiteDistPath,
    apiHandlerPath,
    functionMemoryMB,
    namePrefix: projectName,
    tags: commonTags,
});

export const siteUrl = edge.siteUrl;
export const apiUrl = edge.apiUrl;
export const dbSecretId = database.secretArn;
export const cloudfrontDistributionId = edge.distributionId;
export const lambdaFunctionName = edge.functionName;
export const dbClusterArn = database.clusterArn;
export const bucketName = edge.bucketName;
