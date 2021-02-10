// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as azure_nextgen from "@pulumi/azure-nextgen";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const resourceGroupNameParam = config.require("resourceGroupNameParam");

const locationParam = config.get("locationParam") || "westus2";
const resourceGroup = new azure_nextgen.resources.latest.ResourceGroup("resourceGroup", {
    resourceGroupName: resourceGroupNameParam,
    location: locationParam,
});

const serverFarmNameParam = config.get("serverFarmNameParam") || "appserverfarm";
const skuFamilyParam = config.get("skuFamilyParam") || "P1v2";
const skuNameParam = config.get("skuNameParam") || "P1v2";
const skuSizeParam = config.get("skuSizeParam") || "P1v2";
const skuTier = "PremiumV2";

const serverfarm = new azure_nextgen.web.v20190801.AppServicePlan("serverfarm", {
    kind: "app",
    location: locationParam,
    name: serverFarmNameParam,
    resourceGroupName: resourceGroup.name,
    sku: {
        capacity: 1,
        family: skuFamilyParam,
        name: skuNameParam,
        size: skuSizeParam,
        tier: skuTier,
    },
});

// To get a random suffix
const rand = new random.RandomString("random", {
    length: 5,
    special: false,
});

// Setup backend app
const site1NameParam = config.get("site1NameParam") || pulumi.interpolate `webapp1${rand.result}`;
const site1 = new azure_nextgen.web.v20190801.WebApp("backendApp", {
    kind: "app",
    location: locationParam,
    name: site1NameParam,
    resourceGroupName: resourceGroup.name,
    serverFarmId: serverfarm.id,
    siteConfig: {
        ftpsState: azure_nextgen.web.v20190801.FtpsState.AllAllowed,
    },
});

const webappDnsName = ".azurewebsites.net";
new azure_nextgen.web.v20190801.WebAppHostNameBinding("hostNameBindingSite1", {
    hostName: pulumi.interpolate `${site1.name}${webappDnsName}`,
    hostNameType: "Verified",
    name: pulumi.interpolate `${site1.name}${webappDnsName}`,
    resourceGroupName: resourceGroup.name,
    siteName: site1.name,
});

// Setup frontend app
const site2NameParam = config.get("site2NameParam") || pulumi.interpolate `webapp2${rand.result}`;
const site2 = new azure_nextgen.web.v20190801.WebApp("frontendApp", {
    kind: "app",
    location: locationParam,
    name: site2NameParam,
    resourceGroupName: resourceGroup.name,
    serverFarmId: serverfarm.id,
    
    siteConfig: {
        ftpsState: azure_nextgen.web.v20190801.FtpsState.AllAllowed,
    },
});

new azure_nextgen.web.v20190801.WebAppHostNameBinding("hostNameBindingSite2", {
    hostName: pulumi.interpolate `${site2.name}${webappDnsName}`,
    hostNameType: "Verified",
    name: pulumi.interpolate `${site2.name}${webappDnsName}`,
    resourceGroupName: resourceGroup.name,
    siteName: site2.name,
});

const virtualNetworkNameParam = config.get("virtualNetworkNameParam") || "vnet";
const privateDNSZoneName = "privatelink.azurewebsites.net";
const virtualNetworkCIDRParam = config.get("virtualNetworkCIDRParam") || "10.200.0.0/16";

// Setup a vnet
const virtualNetwork = new azure_nextgen.network.v20200401.VirtualNetwork("virtualNetwork", {
    addressSpace: {
        addressPrefixes: [virtualNetworkCIDRParam],
    },
    location: locationParam,
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetworkNameParam,
});
// Setup private DNS zone
const privateDnsZone = new azure_nextgen.network.v20180901.PrivateZone("privateDnsZone", {
    location: "global",
    privateZoneName: privateDNSZoneName,
    resourceGroupName: resourceGroup.name,
}, {
    dependsOn: [virtualNetwork],
});
const privateEndpointNameParam = config.get("privateEndpointNameParam") || "PrivateEndpoint1";
const privateLinkConnectionNameParam = config.get("privateLinkConnectionNameParam") || "PrivateEndpointLink1";
const subnet1NameParam = config.get("subnet1NameParam") || "SubnetForSite1";
const subnet1CIDRParam = config.get("subnet1CIDRParam") || "10.200.1.0/24";
// Setup a private subnet
const subnet1 = new azure_nextgen.network.v20200401.Subnet("subnet1", {
    addressPrefix: subnet1CIDRParam,
    privateEndpointNetworkPolicies: "Disabled",
    resourceGroupName: resourceGroup.name,
    subnetName: subnet1NameParam,
    virtualNetworkName: virtualNetwork.name,
});

// Private endpoint in the private subnet for site1 (backend)
const privateEndpoint = new azure_nextgen.network.v20200501.PrivateEndpoint("privateEndpoint", {
    location: locationParam,
    privateEndpointName: privateEndpointNameParam,
    privateLinkServiceConnections: [{
        groupIds: ["sites"],
        name: privateLinkConnectionNameParam,
        privateLinkServiceId: site1.id,
    }],
    resourceGroupName: resourceGroup.name,
    subnet: {
        id: subnet1.id,
    },
});

// Setup a private DNS Zone for private endpoint
new azure_nextgen.network.v20200301.PrivateDnsZoneGroup("privateDnsZoneGroup", {
    privateDnsZoneConfigs: [{
        name: "config1",
        privateDnsZoneId: privateDnsZone.id,
    }],
    privateDnsZoneGroupName: `${privateEndpointNameParam}`,
    privateEndpointName: privateEndpoint.name,
    resourceGroupName: resourceGroup.name,
});
new azure_nextgen.network.v20180901.VirtualNetworkLink("virtualNetworkLink", {
    location: "global",
    privateZoneName: privateDnsZone.name,
    registrationEnabled: false,
    resourceGroupName: resourceGroup.name,
    virtualNetwork: {
        id: virtualNetwork.id,
    },
    virtualNetworkLinkName: pulumi.interpolate `${privateDNSZoneName}-link`,
});

// Now setup subnet for site2 (frontend)
const subnet2NameParam = config.get("subnet2NameParam") || "SubnetForSite2";
const subnet2CIDRParam = config.get("subnet2CIDRParam") || "10.200.2.0/24";
const subnet2 = new azure_nextgen.network.v20200401.Subnet("subnet2", {
    addressPrefix: subnet2CIDRParam,
    delegations: [{
        name: "delegation",
        serviceName: "Microsoft.Web/serverfarms",
    }],
    privateEndpointNetworkPolicies: "Enabled",
    resourceGroupName: resourceGroup.name,
    subnetName: subnet2NameParam,
    virtualNetworkName: virtualNetwork.name,
});

new azure_nextgen.web.v20190801.WebAppSwiftVirtualNetworkConnection("virtualNetworkConnForSite2", {
    name: site2.name,
    resourceGroupName: resourceGroup.name,
    subnetResourceId: subnet2.id,
});