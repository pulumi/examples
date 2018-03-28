"use strict";

const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

let config = new pulumi.Config("webserver-azure");
let username = config.require("username");
let password = config.require("password");

let resourceGroup = new azure.core.ResourceGroup("server", {
    location: "West US",
});

let network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpaces: ["10.0.0.0/16"],
    // Workaround two issues:
    // (1) The Azure API recently regressed and now fails when no subnets are defined at Network creation time.
    // (2) The Azure Terraform provider does not return the ID of the created subnets - so this cannot actually be used.
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});

let subnet = new azure.network.Subnet("server-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
});

let publicIP = new azure.network.PublicIp("server-ip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIpAddressAllocation: "Dynamic",
});

let networkInterface = new azure.network.NetworkInterface("server-nic", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: subnet.id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: publicIP.id,
    }],
});

let userData = 
`#!/bin/bash
nohup python -m SimpleHTTPServer 80 &`;

let vm = new azure.compute.VirtualMachine("server-vm", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
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

// Note - due to a bug in the terraform-provider-azurerm, the public IP address is not yet populated corerctly.
exports.publicIP = publicIP.ipAddress;
exports.privateIP = networkInterface.privateIpAddress;
