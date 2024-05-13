// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// dbName is a MySQL database name.
export const dbName = config.get("dbName") || "MyDatabase";
if (!/[a-zA-Z][a-zA-Z0-9]*/.test(dbName)) {
    throw new Error("dbName must begin with a letter and contain only alphanumeric characters");
} else if (dbName.length < 1 || dbName.length > 64) {
    throw new Error("dbName must between 1-64 characters, inclusively");
}

// dbUser is the username for MySQL database access.
export const dbUser = config.require("dbUser");
if (!/[a-zA-Z][a-zA-Z0-9]*/.test(dbUser)) {
    throw new Error("dbUser must begin with a letter and contain only alphanumeric characters");
} else if (dbUser.length < 1 || dbUser.length > 16) {
    throw new Error("dbUser must between 1-16 characters, inclusively");
}

// dbPassword is the password for MySQL database access.
export const dbPassword = config.require("dbPassword");
if (!/[a-zA-Z0-9]*/.test(dbPassword)) {
    throw new Error("dbPassword must only alphanumeric characters");
} else if (dbPassword.length < 1 || dbPassword.length > 41) {
    throw new Error("dbPassword must between 1-41 characters, inclusively");
}

// dbRootPassword is the root password for MySQL.
export const dbRootPassword = config.require("dbRootPassword");
if (!/[a-zA-Z0-9]*/.test(dbRootPassword)) {
    throw new Error("dbRootPassword must only alphanumeric characters");
} else if (dbRootPassword.length < 1 || dbRootPassword.length > 41) {
    throw new Error("dbRootPassword is must between 1-41 characters, inclusively");
}

// instanceType is the WebServer EC2 instance type.
export const instanceType: aws.ec2.InstanceType = <aws.ec2.InstanceType>config.get("instanceType") || "m3.medium";
if (false) {
    // TODO: dynamically verify the values.
    throw new Error("instanceType must be a valid EC2 instance type");
}

