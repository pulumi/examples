// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import { getFileHash } from "./util";

// Get the config ready to go.
const config = new pulumi.Config();

// Set login credentials for the VM
const username = config.require("username");
const password = config.requireSecret("password");

// retrieve the ssh publicKey from config
const publicKey = config.get("publicKey");

// The privateKey associated with the selected key must be provided (either directly or base64 encoded).
const privateKey = config.requireSecret("privateKey").apply(key => {
    if (key.startsWith("-----BEGIN RSA PRIVATE KEY-----")) {
        return key;
    } else {
        return Buffer.from(key, "base64").toString("ascii");
    }
});

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
const pubIp = new azure.network.PublicIp("server-ip", {
    resourceGroupName,
    allocationMethod: "Dynamic",
});

const networkInterface = new azure.network.NetworkInterface("server-nic", {
    resourceGroupName,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: network.subnets[0].id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: pubIp.id,
    }],
});

const sg = new azure.network.NetworkSecurityGroup("sg", {
    resourceGroupName: resourceGroupName,
    securityRules: [
        {
            access: "Allow",
            protocol: "*",
            sourceAddressPrefix: "*",
            destinationAddressPrefix: "*",
            destinationPortRange: "*",
            sourcePortRange: "*",
            direction: "Inbound",
            name: "in",
            priority: 100,
        },
        {
            access: "Allow",
            protocol: "*",
            sourceAddressPrefix: "*",
            destinationAddressPrefix: "*",
            destinationPortRange: "*",
            sourcePortRange: "*",
            direction: "Outbound",
            name: "out",
            priority: 101,
        },
    ],

});

const sga = new azure.network.NetworkInterfaceSecurityGroupAssociation("assoc", {
    networkInterfaceId: networkInterface.id,
    networkSecurityGroupId: sg.id,
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
    },
    osProfileLinuxConfig: {
        disablePasswordAuthentication: false,
        sshKeys: [
            {
                keyData: publicKey,
                path: `/home/${username}/.ssh/authorized_keys`,
            },
        ],
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
const done = pulumi.all({ _: vm.id, name: pubIp.name, resourceGroupName: pubIp.resourceGroupName });

export const ipAddress = done.apply(d => {
    return azure.network.getPublicIP({
        name: d.name,
        resourceGroupName: d.resourceGroupName,
    }, { async: true }).then(ip => ip.ipAddress);
});

const connection: command.types.input.remote.ConnectionArgs = {
    host: ipAddress,
    user: username,
    password,
    privateKey,
};

const changeToken = getFileHash("myapp.conf");
// Copy a config file to our server.
const cpConfig = new command.remote.CopyFile("config", {
    triggers: [changeToken],
    connection,
    localPath: "myapp.conf",
    remotePath: `/home/${username}/myapp.conf`,
}, { dependsOn: [vm, pubIp] });

// Execute a basic command on our server.
const catConfig = new command.remote.Command("cat-config", {
    triggers: [changeToken],
    connection,
    create: `cat /home/${username}/myapp.conf`,
}, { dependsOn: cpConfig });


// export the command output
export const catConfigStdout = catConfig.stdout;
