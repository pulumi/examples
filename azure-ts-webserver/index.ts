// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

// Get the desired username and password for our VM.
const config = new pulumi.Config();
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

// Now allocate a public IP and assign it to our NIC.
const publicIp = new azure.network.PublicIp("server-ip", {
    resourceGroupName,
    allocationMethod: "Dynamic",
});

const networkInterface = new azure.network.NetworkInterface("server-nic", {
    resourceGroupName,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: network.subnets[0].id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: publicIp.id,
    }],
});

// Now create the VM, using the resource group and NIC allocated above.
const vm = new azure.compute.VirtualMachine("server-vm", {
    resourceGroupName,
    networkInterfaceIds: [networkInterface.id],
    vmSize: "Standard_A0",
    deleteDataDisksOnTermination: true,
    deleteOsDiskOnTermination: true,
    osProfile: {
        computerName: "hostname",
        adminUsername: username,
        adminPassword: password,
        customData: `#!/bin/bash\n
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
    },
    osProfileLinuxConfig: {
        disablePasswordAuthentication: false,
    },
    storageOsDisk: {
        createOption: "FromImage",
        name: "myosdisk1",
    },
    storageImageReference: {
        publisher: "canonical",
        offer: "UbuntuServer",
        sku: "16.04-LTS",
        version: "latest",
    },
});

// The public IP address is not allocated until the VM is running, so wait for that
// resource to create, and then lookup the IP address again to report its public IP.
const done = pulumi.all({ _: vm.id, name: publicIp.name, resourceGroupName: publicIp.resourceGroupName });

export const ipAddress = done.apply(d => {
    return azure.network.getPublicIP({
        name: d.name,
        resourceGroupName: d.resourceGroupName,
    }, { async: true }).then(ip => ip.ipAddress);
});
