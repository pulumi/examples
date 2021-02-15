// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as network from "@pulumi/azure-nextgen/network/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config();

// setup a resource group
const resourceGroupName = config.get("resourceGroupName") || "webapp-pvtendpoint-vnet-injection";
const location = config.get("location") || "westus2";
const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: resourceGroupName,
    location: location,
});

const serverfarm = new web.AppServicePlan("serverfarm", {
    kind: "app",
    name: "appServerFarm",
    resourceGroupName: resourceGroup.name,
    sku: {
        capacity: 1,
        family: "P1v2",
        name: "P1v2",
        size: "P1v2",
        tier: "PremiumV2",
    },
});

// To get a random suffix
const rand = new random.RandomString("random", {
    length: 5,
    special: false,
});

// Setup backend app
const backendName = pulumi.interpolate`backend${rand.result}`;
const backendApp = new web.WebApp("backendApp", {
    kind: "app",
    name: backendName,
    resourceGroupName: resourceGroup.name,
    serverFarmId: serverfarm.id,
});

export const backendURL = backendApp.defaultHostName;

// Setup frontend app
const frontendName = pulumi.interpolate`frontend${rand.result}`;
const frontendApp = new web.WebApp("frontendApp", {
    kind: "app",
    name: frontendName,
    resourceGroupName: resourceGroup.name,
    serverFarmId: serverfarm.id,
});

export const frontEndURL = frontendApp.defaultHostName;

// Setup a vnet
const virtualNetworkCIDR = config.get("virtualNetworkCIDR") || "10.200.0.0/16";
const virtualNetwork = new network.VirtualNetwork("virtualNetwork", {
    addressSpace: {
        addressPrefixes: [virtualNetworkCIDR],
    },
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: "vnet",
}, {ignoreChanges: ["subnets"]}); // https://github.com/pulumi/pulumi-azure-nextgen/issues/103

// Setup private DNS zone
const privateDnsZone = new network.PrivateZone("privateDnsZone", {
    location: "global",
    privateZoneName: "privatelink.azurewebsites.net",
    resourceGroupName: resourceGroup.name,
}, {
    dependsOn: [virtualNetwork],
});

// Setup a private subnet for backend
const backendCIDR = config.get("backendCIDR") || "10.200.1.0/24";
const backendSubnet = new network.Subnet("backendSubnet", {
    addressPrefix: backendCIDR,
    privateEndpointNetworkPolicies: "Disabled",
    resourceGroupName: resourceGroup.name,
    subnetName: "subnetForBackend",
    virtualNetworkName: virtualNetwork.name,
});

// Private endpoint in the private subnet for backend
const privateEndpoint = new network.PrivateEndpoint("privateEndpointForBackend", {
    privateEndpointName: "privateEndpointForBackend",
    privateLinkServiceConnections: [{
        groupIds: ["sites"],
        name: "privateEndpointLink1",
        privateLinkServiceId: backendApp.id,
    }],
    resourceGroupName: resourceGroup.name,
    subnet: {
        id: backendSubnet.id,
    },
});

// Setup a private DNS Zone for private endpoint
const privateDNSZoneGroup = new network.PrivateDnsZoneGroup("privateDnsZoneGroup", {
    privateDnsZoneConfigs: [{
        name: "config1",
        privateDnsZoneId: privateDnsZone.id,
    }],
    privateDnsZoneGroupName: privateEndpoint.name,
    privateEndpointName: privateEndpoint.name,
    resourceGroupName: resourceGroup.name,
});

export const privateEndpointURL = privateDNSZoneGroup.privateDnsZoneConfigs.apply(zoneConfigs => zoneConfigs![0].recordSets[0].fqdn);

const virtualNetworkLink = new network.VirtualNetworkLink("virtualNetworkLink", {
    location: "global",
    privateZoneName: privateDnsZone.name,
    registrationEnabled: false,
    resourceGroupName: resourceGroup.name,
    virtualNetwork: {
        id: virtualNetwork.id,
    },
    virtualNetworkLinkName: pulumi.interpolate`${privateDnsZone.name}-link`,
});

// Now setup frontend subnet
const frontendCIDR = config.get("frontendCIDR") || "10.200.2.0/24";
const frontendSubnet = new network.Subnet("frontendSubnet", {
    addressPrefix: frontendCIDR,
    delegations: [{
        name: "delegation",
        serviceName: "Microsoft.Web/serverfarms",
    }],
    privateEndpointNetworkPolicies: "Enabled",
    resourceGroupName: resourceGroup.name,
    subnetName: "frontendSubnet",
    virtualNetworkName: virtualNetwork.name,
});

const virtualNetworkConn = new web.WebAppSwiftVirtualNetworkConnection("virtualNetworkConnForFrontend", {
    name: frontendApp.name,
    resourceGroupName: resourceGroup.name,
    subnetResourceId: frontendSubnet.id,
});
