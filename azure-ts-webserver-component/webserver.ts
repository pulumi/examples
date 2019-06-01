import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { specialArchiveSig } from "@pulumi/pulumi/runtime";

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

/**
 * WebServer is a reusable web server component that creates and exports a NIC, public IP, and VM.
 */
export class WebServer extends pulumi.ComponentResource {
    public readonly publicIp: azure.network.PublicIp;
    public readonly networkInterface: azure.network.NetworkInterface;
    public readonly vm: azure.compute.VirtualMachine;

    /**
     * Allocate a new web server VM, NIC, and public IP address.
     * @param name The name of the web server resource.
     * @param args A bag of arguments to control the web server VM creation.
     */
    constructor(name: string, args: WebServerArgs) {
        super("ws-ts-azure-comp:webserver:WebServer", name);

        // Allocate a public IP and assign it to our NIC.
        this.publicIp = new azure.network.PublicIp(`${name}-ip`, {
            resourceGroupName,
            allocationMethod: "Dynamic",
        }, { parent: this });
        this.networkInterface = new azure.network.NetworkInterface(`${name}-nic`, {
            resourceGroupName,
            ipConfigurations: [{
                name: "webserveripcfg",
                subnetId: subnet.id,
                privateIpAddressAllocation: "Dynamic",
                publicIpAddressId: this.publicIp.id,
            }],
        }, { parent: this });

        // Now create the VM, using the resource group and NIC allocated above.
        this.vm = new azure.compute.VirtualMachine(`${name}-vm`, {
            resourceGroupName,
            networkInterfaceIds: [ this.networkInterface.id ],
            vmSize: args.vmSize || "Standard_A0",
            deleteDataDisksOnTermination: true,
            deleteOsDiskOnTermination: true,
            osProfile: {
                computerName: "hostname",
                adminUsername: args.username,
                adminPassword: args.password,
                customData: args.bootScript,
            },
            osProfileLinuxConfig: {
                disablePasswordAuthentication: false,
            },
            storageOsDisk: {
                createOption: "FromImage",
                name: `${name}-osdisk1`,
            },
            storageImageReference: {
                publisher: "canonical",
                offer: "UbuntuServer",
                sku: "16.04-LTS",
                version: "latest",
            },
        }, { parent: this });
    }

    public getIpAddress(): pulumi.Output<string> {
        // The public IP address is not allocated until the VM is running, so wait for that
        // resource to create, and then lookup the IP address again to report its public IP.
        let ready = pulumi.all({
            _: this.vm.id, name: this.publicIp.name, resourceGroupName: this.publicIp.resourceGroupName });
        return ready.apply(d =>
            azure.network.getPublicIP({
                name: d.name, resourceGroupName: d.resourceGroupName }).then(ip => ip.ipAddress));
    }
}

export interface WebServerArgs {
    /**
     * A required username for the VM login.
     */
    username: pulumi.Input<string>;
    /**
     * A required encrypted password for the VM password.
     */
    password: pulumi.Input<string>;
    /**
     * An optional boot script that the VM will use.
     */
    bootScript?: pulumi.Input<string>;
    /**
     * An optional VM size; if unspecified, Standard_A0 (micro) will be used.
     */
    vmSize?: pulumi.Input<string>;
}
