// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const adminUser = config.get("adminUser") || "azureuser";
const adminPassword = config.getSecret("adminPassword") || new random.RandomPassword("pwd", {
    length: 20,
    special: true,
}).result;
const domain = config.get("domain") || new random.RandomString("domain", {
    length: 10,
    number: false,
    special: false,
    upper: false,
}).result;
const applicationPort = config.getNumber("applicationPort") || 80;

const resourceGroup = new azure.core.ResourceGroup("vmss-rg");

const publicIp = new azure.network.PublicIp("public-ip", {
    resourceGroupName: resourceGroup.name,
    allocationMethod: "Static",
    domainNameLabel: domain,
});

const loadBalancer = new azure.lb.LoadBalancer("lb", {
    resourceGroupName: resourceGroup.name,
    frontendIpConfigurations: [{
        name: "PublicIPAddress",
        publicIpAddressId: publicIp.id,
    }],
});

const bpepool = new azure.lb.BackendAddressPool("bpepool", {
    resourceGroupName: resourceGroup.name,
    loadbalancerId: loadBalancer.id,
});

const sshProbe = new azure.lb.Probe("ssh-probe", {
    resourceGroupName: resourceGroup.name,
    loadbalancerId: loadBalancer.id,
    port: applicationPort,
});

const natRule = new azure.lb.Rule("lbnatrule-http", {
    resourceGroupName: resourceGroup.name,
    backendAddressPoolId: bpepool.id,
    backendPort: applicationPort,
    frontendIpConfigurationName: "PublicIPAddress",
    frontendPort: applicationPort,
    loadbalancerId: loadBalancer.id,
    probeId: sshProbe.id,
    protocol: "Tcp",
});

const vnet = new azure.network.VirtualNetwork("vnet", {
    resourceGroupName: resourceGroup.name,
    addressSpaces: ["10.0.0.0/16"],
});

const subnet = new azure.network.Subnet("subnet", {
    enforcePrivateLinkEndpointNetworkPolicies: false,
    resourceGroupName: resourceGroup.name,
    addressPrefix: "10.0.2.0/24",
    virtualNetworkName: vnet.name,
});

const scaleSet = new azure.compute.ScaleSet("vmscaleset", {
    resourceGroupName: resourceGroup.name,
    networkProfiles: [{
        ipConfigurations: [{
            loadBalancerBackendAddressPoolIds: [bpepool.id],
            name: "IPConfiguration",
            primary: true,
            subnetId: subnet.id,
        }],
        name: "networkprofile",
        primary: true,
    }],
    osProfile: {
        adminUsername: adminUser,
        adminPassword,
        computerNamePrefix: "vmlab",
        customData:
`#cloud-config
packages:
    - nginx`,
    },
    osProfileLinuxConfig: {
        disablePasswordAuthentication: false,
    },
    sku: {
        capacity: 1,
        name: "Standard_DS1_v2",
        tier: "Standard",
    },
    storageProfileDataDisks: [{
        caching: "ReadWrite",
        createOption: "Empty",
        diskSizeGb: 10,
        lun: 0,
    }],
    storageProfileImageReference: {
        offer: "UbuntuServer",
        publisher: "Canonical",
        sku: "16.04-LTS",
        version: "latest",
    },
    storageProfileOsDisk: {
        caching: "ReadWrite",
        createOption: "FromImage",
        managedDiskType: "Standard_LRS",
        name: "",
    },
    upgradePolicyMode: "Manual",
}, { dependsOn: [bpepool] });

const autoscale = new azure.monitoring.AutoscaleSetting("vmss-autoscale", {
    resourceGroupName: resourceGroup.name,
    notification: {
        email: {
            customEmails: ["admin@contoso.com"],
            sendToSubscriptionAdministrator: true,
            sendToSubscriptionCoAdministrator: true,
        },
    },
    profiles: [{
        capacity: {
            default: 1,
            maximum: 10,
            minimum: 1,
        },
        name: "defaultProfile",
        rules: [
            {
                metricTrigger: {
                    metricName: "Percentage CPU",
                    metricResourceId: scaleSet.id,
                    operator: "GreaterThan",
                    statistic: "Average",
                    threshold: 75,
                    timeAggregation: "Average",
                    timeGrain: "PT1M",
                    timeWindow: "PT5M",
                },
                scaleAction: {
                    cooldown: "PT1M",
                    direction: "Increase",
                    type: "ChangeCount",
                    value: 1,
                },
            },
            {
                metricTrigger: {
                    metricName: "Percentage CPU",
                    metricResourceId: scaleSet.id,
                    operator: "LessThan",
                    statistic: "Average",
                    threshold: 25,
                    timeAggregation: "Average",
                    timeGrain: "PT1M",
                    timeWindow: "PT5M",
                },
                scaleAction: {
                    cooldown: "PT1M",
                    direction: "Decrease",
                    type: "ChangeCount",
                    value: 1,
                },
            },
        ],
    }],
    targetResourceId: scaleSet.id,
});

export const publicAddress = publicIp.fqdn;
