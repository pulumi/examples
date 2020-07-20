// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import { readFileSync } from "fs";
import { CosmosApp, GlobalContext, RegionalContext } from "./cosmosApp";

// Read a list of target locations from the config file:
// Expecting a comma-separated list, e.g., "westus,eastus,westeurope"
const locations = new pulumi.Config().require("locations").split(",");

const resourceGroup = new azure.core.ResourceGroup("cosmosvms-rg", {
    location: locations[0],
});

function buildVMScaleSetApp({ cosmosAccount, database, container, opts }: GlobalContext) {
    const file = readFileSync("./vm/vmCustomData.yaml").toString();

    return ({ location }: RegionalContext) => {
        const domainName = new random.RandomString(`pipdns${location}`, { length: 10, special: false, upper: false, number: false }).result;

        const publicIp = new azure.network.PublicIp(`pip-${location}`, {
            resourceGroupName: resourceGroup.name,
            location,
            allocationMethod: "Static",
            domainNameLabel: domainName,
        }, opts);

        const loadBalancer = new azure.lb.LoadBalancer(`lb-${location}`, {
            resourceGroupName: resourceGroup.name,
            location,
            frontendIpConfigurations: [{
                name: "PublicIPAddress",
                publicIpAddressId: publicIp.id,
            }],
        }, opts);

        const bpepool = new azure.lb.BackendAddressPool(`bap-${location}`, {
            resourceGroupName: resourceGroup.name,
            loadbalancerId: loadBalancer.id,
        }, opts);

        const probe = new azure.lb.Probe(`ssh-probe-${location}`.substring(0, 16), {
            resourceGroupName: resourceGroup.name,
            loadbalancerId: loadBalancer.id,
            port: 80,
        }, opts);

        const rule = new azure.lb.Rule(`rl-${location}`, {
            resourceGroupName: resourceGroup.name,
            backendAddressPoolId: bpepool.id,
            backendPort: 80,
            frontendIpConfigurationName: "PublicIPAddress",
            frontendPort: 80,
            loadbalancerId: loadBalancer.id,
            probeId: probe.id,
            protocol: "Tcp",
        }, opts);

        const vnet = new azure.network.VirtualNetwork(`vnet-${location}`, {
            resourceGroupName: resourceGroup.name,
            location,
            addressSpaces: ["10.0.0.0/16"],
        }, opts);

        const subnet = new azure.network.Subnet(`subnet-${location}`, {
            resourceGroupName: resourceGroup.name,
            addressPrefixes: ["10.0.2.0/24"],
            virtualNetworkName: vnet.name,
        }, opts);

        const customData = pulumi.all([cosmosAccount.endpoint, cosmosAccount.primaryMasterKey, database.name, container.name])
            .apply(([endpoint, key, databaseName, collectionName]) => {
                const s = file.replace("${ENDPOINT}", endpoint)
                    .replace("${MASTER_KEY}", key)
                    .replace("${DATABASE}", databaseName)
                    .replace("${COLLECTION}", collectionName)
                    .replace("${LOCATION}", location);
                return s;
            });

        const scaleSet = new azure.compute.ScaleSet(`vs-${location}`, {
            resourceGroupName: resourceGroup.name,
            location,
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
                adminUsername: "neo",
                adminPassword: "SEcurePwd$3",
                computerNamePrefix: "lab",
                customData,
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
                sku: "18.04-LTS",
                version: "latest",
            },
            storageProfileOsDisk: {
                caching: "ReadWrite",
                createOption: "FromImage",
                managedDiskType: "Standard_LRS",
                name: "",
            },
            upgradePolicyMode: "Automatic",
        }, { dependsOn: [bpepool], ...opts });

        const autoscale = new azure.monitoring.AutoscaleSetting(`as-${location}`, {
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
        }, opts);

        return {
            id: publicIp.id,
        };
    };
}

export const vmss = new CosmosApp("vms", {
    resourceGroup,
    locations,
    databaseName: "pricedb",
    containerName: "prices",
    factory: buildVMScaleSetApp,
});
