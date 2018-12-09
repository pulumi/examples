import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { getLinuxAmi } from "pawsami";
import { Provisioner } from "./provisioner";
import { CopyFile, RemoteExec } from "./provisioners";

// Get the config ready to go.
const config = new pulumi.Config();
const publicKey = config.require("publicKey");
const privateKey = config.require("privateKey");
const privateKeyPassphrase = config.get("privateKeyPassphrase");

// Create a new security group that permits SSH and web access.
const secgrp = new aws.ec2.SecurityGroup("secgrp", {
    description: "Foo",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// Create an EC2 server that we'll then provision stuff onto.
const size = "t2.micro";
const key = new aws.ec2.KeyPair("key", { publicKey });
const server = new aws.ec2.Instance("server", {
    instanceType: size,
    ami: getLinuxAmi(size),
    keyName: key.keyName,
    securityGroups: [ secgrp.name ],
    // userData: userData,
});
const conn = {
    host: server.publicIp,
    username: "ec2-user",
    privateKey,
    privateKeyPassphrase,
};

// Copy a config file to our server.
const cpConfig = new CopyFile("config", {
    conn,
    src: "myapp.conf",
    dest: "myapp.conf",
});

// Execute a basic command on our server.
const catConfig = new RemoteExec("cat-config", {
    conn,
    command: "cat myapp.conf",
}, { dependsOn: cpConfig });

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
