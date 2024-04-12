// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import { getFileHash } from "./util";

// Get the config ready to go.
const config = new pulumi.Config();

// If keyName is provided, an existing KeyPair is used, else if publicKey is provided a new KeyPair
// derived from the publicKey is created.
let keyName: pulumi.Input<string> | undefined = config.get("keyName");
const publicKey = config.get("publicKey");

// The privateKey associated with the selected key must be provided (either directly or base64 encoded).
const privateKey = config.requireSecret("privateKey").apply(key => {
    if (key.startsWith("-----BEGIN RSA PRIVATE KEY-----")) {
        return key;
    } else {
        return Buffer.from(key, "base64").toString("ascii");
    }
});

// Create a new security group that permits SSH and web access.
const secgrp = new aws.ec2.SecurityGroup("secgrp", {
    description: "Foo",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// Get the AMI
const amiId = aws.ec2.getAmi({
    owners: ["amazon"],
    mostRecent: true,
    filters: [{
        name: "name",
        values: ["amzn2-ami-hvm-*-x86_64-gp2"],
    }],
}, { async: true }).then(ami => ami.id);

// Create an EC2 server that we'll then provision stuff onto.
const size = "t2.micro";
if (!keyName) {
    if (!publicKey) {
        throw new Error("must provide one of `keyName` or `publicKey`");
    }
    const key = new aws.ec2.KeyPair("key", { publicKey });
    keyName = key.keyName;
}
const server = new aws.ec2.Instance("server", {
    instanceType: size,
    ami: amiId,
    keyName: keyName,
    vpcSecurityGroupIds: [secgrp.id],
});
const connection: command.types.input.remote.ConnectionArgs = {
    host: server.publicIp,
    user: "ec2-user",
    privateKey,
};

const changeToken = getFileHash("myapp.conf");
// Copy a config file to our server.
const cpConfig = new command.remote.CopyFile("config", {
    triggers: [changeToken],
    connection,
    localPath: "myapp.conf",
    remotePath: "myapp.conf",
}, { dependsOn: server });

// Execute a basic command on our server.
const catConfig = new command.remote.Command("cat-config", {
    triggers: [changeToken],
    connection,
    create: "cat myapp.conf",
}, { dependsOn: cpConfig });

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
export const catConfigStdout = catConfig.stdout;
