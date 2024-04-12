// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.
// Deploys:
// - Network: VPC, Subnets, Security Groups
// - DB Backend: MySQL RDS
// - FrontEnd: WordPress in Fargate

import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as backend from "./backend";
import * as frontend from "./frontend";
import * as network from "./network";

// Get config data
const config = new pulumi.Config();
const serviceName = config.get("serviceName") || "wp-fargate-rds";
const dbName = config.get("dbName") || "wordpress";
const dbUser = config.get("dbUser") || "admin";

// Get secretified password from config or create one using the "random" package
let dbPassword = config.getSecret("dbPassword");
if (!dbPassword) {
  dbPassword = new random.RandomPassword("dbPassword", {
    length: 16,
    special: true,
    overrideSpecial: "_%",
  }).result;
}

const vpc = new network.Vpc(`${serviceName}-net`, {});

const db = new backend.Db(`${serviceName}-db`, {
  dbName: dbName,
  dbUser: dbUser,
  dbPassword: dbPassword,
  subnetIds: vpc.subnetIds,
  securityGroupIds: vpc.rdsSecurityGroupIds,
});

const fe = new frontend.WebService(`${serviceName}-fe`, {
  dbHost: db.dbAddress,
  dbPort: "3306",
  dbName: db.dbName,
  dbUser: db.dbUser,
  dbPassword: db.dbPassword,
  vpcId: vpc.vpcId,
  subnetIds: vpc.subnetIds,
  securityGroupIds: vpc.feSecurityGroupIds,
});

export const webServiceUrl = pulumi.interpolate`http://${fe.dnsName}`;
export const ecsClusterName = fe.clusterName;
export const databaseEndpoint = db.dbAddress;
export const databaseUserName = db.dbUser;
export const databasePassword = db.dbPassword;
