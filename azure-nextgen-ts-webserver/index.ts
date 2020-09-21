// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

import * as compute from "@pulumi/azure-nextgen/compute/latest";
import * as network from "@pulumi/azure-nextgen/network/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";

// Get the desired username and password for our VM.
const config = new pulumi.Config();
const location = config.get("location") || "westus";
const username = config.require("username");
const password = config.requireSecret("password");

// All resources will share a resource group.
const resourceGroupName = new resources.ResourceGroup("server-rg", {
    resourceGroupName: "server-rg",
    location,
}).name;

// Create a network and subnet for all VMs.
const virtualNetwork = new network.VirtualNetwork("server-network", {
    resourceGroupName,
    location,
    virtualNetworkName: "server-network",
    addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});

// Now allocate a public IP and assign it to our NIC.
const publicIp = new network.PublicIPAddress("server-ip", {
    resourceGroupName,
    location,
    publicIpAddressName: "server-ip",
    publicIPAllocationMethod: "Dynamic",
});

const networkInterface = new network.NetworkInterface("server-nic", {
    resourceGroupName,
    location,
    networkInterfaceName: "server-nic",
    ipConfigurations: [{
        name: "webserveripcfg",
        subnet: { id: virtualNetwork.subnets[0].id },
        privateIPAllocationMethod: "Dynamic",
        publicIPAddress: { id: publicIp.id },
    }],
});

const initScript = `#!/bin/bash\n
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

// Now create the VM, using the resource group and NIC allocated above.
const vm = new compute.VirtualMachine("server-vm", {
    resourceGroupName,
    location,
    vmName: "server-vm",
    networkProfile: {
        networkInterfaces: [{ id: networkInterface.id }],
    },
    hardwareProfile: {
        vmSize: "Standard_A0",
    },
    osProfile: {
        computerName: "hostname",
        adminUsername: username,
        adminPassword: password,
        customData: Buffer.from(initScript).toString("base64"),
        linuxConfiguration: {
            disablePasswordAuthentication: false,
        },
    },
    storageProfile: {
        osDisk: {
            createOption: "FromImage",
            name: "myosdisk1",
        },
        imageReference: {
            publisher: "canonical",
            offer: "UbuntuServer",
            sku: "16.04-LTS",
            version: "latest",
        },
    },
});

// The public IP address is not allocated until the VM is running, so wait for that
// resource to create, and then lookup the IP address again to report its public IP.
const done = pulumi.all({ _: vm.id, name: publicIp.name, resourceGroupName: resourceGroupName });

export const ipAddress = done.apply(async (d) => {
    return network.getPublicIPAddress({
        resourceGroupName: d.resourceGroupName,
        publicIpAddressName: d.name,
    }).then(ip => ip.ipAddress);
});
