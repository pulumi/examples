// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import { WebServer } from "./webserver";

// Get the desired username and password for our webserver VMs.
const config = new pulumi.Config();
const count = config.getNumber("count") || 2;
const username = config.require("username");
const password = config.requireSecret("password");

// All resources will share a resource group.
const resourceGroupName = new azure.core.ResourceGroup("server-rg").name;

// Create a network and subnet for all VMs.
const network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName,
    addressSpaces: ["10.0.0.0/16"],
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});

// Now, allocate a few websever VMs -- by default, just 2, but this is configurable.
export const ipAddresses: pulumi.Output<string>[] = [];
for (let i = 0; i < count; i++) {
    const server = new WebServer(`ws-${i}`, {
        username,
        password,
        bootScript: `#!/bin/bash\n
echo "Hello, from Server #{i+1}!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
        resourceGroupName: resourceGroupName,
        subnetId: network.subnets[0].id,
    });
    ipAddresses.push(server.getIpAddress());
}
