import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { WebServer } from "./webserver";

// Get the desired username and password for our webserver VMs.
let config = new pulumi.Config();
let count = config.getNumber("count") || 2;
let username = config.require("username");
let password = config.requireSecret("password");

// All resources will share a resource group.
let resourceGroupName = new azure.core.ResourceGroup("server").name;

// Create a network and subnet for all VMs.
let network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName,
    addressSpaces: [ "10.0.0.0/16" ],
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});
let subnet = new azure.network.Subnet("server-subnet", {
    resourceGroupName,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
});

// Now, allocate a few websever VMs -- by default, just 2, but this is configurable.
export let ipAddresses = [];
for (let i = 0; i < count; i++) {
    let server = new WebServer(`ws-${i}`, {
        username,
        password,
        bootScript: `#!/bin/bash\n
echo "Hello, from Server #{i+1}!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
        resourceGroupName: resourceGroupName,
        subnetId: subnet.id,
    });
    ipAddresses.push(server.getIpAddress());
}
