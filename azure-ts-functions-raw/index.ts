// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";

// Create a dedicated resource group for Linux App Service Plan - require for Python
const linuxResourceGroup = new azure.core.ResourceGroup("linuxrg");

// Python Function App won't run on Windows Consumption Plan, so we create a Linux Consumption Plan instead
const linuxPlan = new azure.appservice.Plan("linux-asp", {
    resourceGroupName: linuxResourceGroup.name,
    kind: "Linux",
    sku: { tier: "Dynamic", size: "Y1" },
    reserved: true,
});

export var resourceGroupName = linuxResourceGroup.name;
export var linuxPlanId = linuxPlan.id;
