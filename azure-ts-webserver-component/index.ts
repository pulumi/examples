import * as pulumi from "@pulumi/pulumi";
import { WebServer } from "./webserver";

// Get the desired username and password for our webserver VMs.
let config = new pulumi.Config();
let count = config.getNumber("count") || 2;
let username = config.require("username");
let password = config.requireSecret("password");

// Now, allocate a few websever VMs -- by default, just 2, but this is configurable.
export let ipAddresses = [];
for (let i = 0; i < count; i++) {
    let server = new WebServer(`ws-${i}`, {
        username,
        password,
        bootScript: `#!/bin/bash\n
echo "Hello, from Server #{i+1}!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
    });
    ipAddresses.push(server.getIpAddress());
}
