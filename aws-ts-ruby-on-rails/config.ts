import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// keyName is the name of an existing EC2 KeyPair to enable SSH access to the instances.
export const keyName = config.get("keyName");

// dbName is a MySQL database name.
export const dbName = config.get("dbName") || "MyDatabase";
if (!/[a-zA-Z][a-zA-Z0-9]*/.test(dbName)) {
    throw new Error("dbName must begin with a letter and contain only alphanumeric characters");
} else if (dbName.length < 1 || dbName.length > 64) {
    throw new Error("dbName must between 1-64 characters, inclusively")
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
export const instanceType: aws.ec2.InstanceType = <aws.ec2.InstanceType>config.get("instanceType") || "t2.small";
if (false) {
    // TODO: dynamically verify the values.
    throw new Error("instanceType must be a valid EC2 instance type");
}

// sshLocation is the IP address range that can be used to SSH to the EC2 instances.
export const sshLocation = config.get("sshLocation") || "0.0.0.0/0";
if (!new RegExp("(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})/(\\d{1,2})").test(sshLocation)) {
    throw new Error("sshLocation must be a valid IP CIDR range of the form x.x.x.x/x");
} else if (dbName.length < 1 || dbName.length > 41) {
    throw new Error("sshLocation is must between 9-18 characters, inclusively");
}
