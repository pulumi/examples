import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Get the desired username and password for our VM.
let config = new pulumi.Config();
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

// Now allocate a public IP and assign it to our NIC.
let publicIp = new azure.network.PublicIp("server-ip", {
    resourceGroupName,
    allocationMethod: "Dynamic",
});
let networkInterface = new azure.network.NetworkInterface("server-nic", {
    resourceGroupName,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: subnet.id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: publicIp.id,
    }],
});

// Now create the VM, using the resource group and NIC allocated above.
let vm = new azure.compute.VirtualMachine("server-vm", {
    resourceGroupName,
    networkInterfaceIds: [ networkInterface.id ],
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
let done = pulumi.all({
    _: vm.id, name: publicIp.name, resourceGroupName: publicIp.resourceGroupName });
export const ipAddress = done.apply(d =>
    azure.network.getPublicIP({
        name: d.name, resourceGroupName: d.resourceGroupName }).then(ip => ip.ipAddress));
