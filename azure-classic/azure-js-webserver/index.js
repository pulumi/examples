"use strict";

const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

let config = new pulumi.Config();
let username = config.require("username");
let password = config.require("password");

let resourceGroup = new azure.core.ResourceGroup("server", {
    location: azure.Locations.WestUS,
});

let network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName: resourceGroup.name,
    addressSpaces: ["10.0.0.0/16"],
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});

let publicIP = new azure.network.PublicIp("server-ip", {
    resourceGroupName: resourceGroup.name,
    allocationMethod: "Dynamic",
});

let networkInterface = new azure.network.NetworkInterface("server-nic", {
    resourceGroupName: resourceGroup.name,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: network.subnets[0].id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: publicIP.id,
    }],
});

let userData = 
`#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

let vm = new azure.compute.VirtualMachine("server-vm", {
    resourceGroupName: resourceGroup.name,
    networkInterfaceIds: [networkInterface.id],
    vmSize: "Standard_A0",
    deleteDataDisksOnTermination: true,
    deleteOsDiskOnTermination: true,
    osProfile: {
        computerName: "hostname",
        adminUsername: username,
        adminPassword: password,
        customData: userData,
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

// The public IP address is not allocated until the VM is running, so we wait
// for that resource to create, and then lookup the IP address again to report
// its public IP.
exports.publicIP = pulumi.all({ id: vm.id, name: publicIP.name, resourceGroupName: publicIP.resourceGroupName }).apply(ip =>
    azure.network.getPublicIP({
        name: ip.name,
        resourceGroupName: ip.resourceGroupName,
    }, { async: true }).then(ip => ip.ipAddress)
);
