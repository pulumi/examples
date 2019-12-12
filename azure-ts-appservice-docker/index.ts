// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";


// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("samples");

// Create a dedicated App Service Plan for Linux App Services
const plan = new azure.appservice.Plan("linux-apps", {
    resourceGroupName: resourceGroup.name,
    kind: "Linux",
    reserved: true,
    sku: {
        tier: "Basic",
        size: "B1",
    },
});


/**
 * Scenario 1: deploying an image from Docker Hub.
 * The example uses a HelloWorld application written in Go.
 * Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
 */
const imageInDockerHub = "microsoft/azure-appservices-go-quickstart";

const helloApp = new azure.appservice.AppService("hello-app", {
    resourceGroupName: resourceGroup.name,
    appServicePlanId: plan.id,
    appSettings: {
        WEBSITES_ENABLE_APP_SERVICE_STORAGE: "false",
    },
    siteConfig: {
        alwaysOn: true,
        linuxFxVersion: `DOCKER|${imageInDockerHub}`,
    },
    httpsOnly: true,
});

export const helloEndpoint = pulumi.interpolate`https://${helloApp.defaultSiteHostname}/hello`;


/**
 * Scenario 2: deploying a custom image from Azure Container Registry.
 */
const customImage = "node-app";

const registry = new azure.containerservice.Registry("myregistry", {
    resourceGroupName: resourceGroup.name,
    sku: "Basic",
    adminEnabled: true,
});

const myImage = new docker.Image(customImage, {
    imageName: pulumi.interpolate`${registry.loginServer}/${customImage}:v1.0.0`,
    build: {
        context: `./${customImage}`,
    },
    registry: {
        server: registry.loginServer,
        username: registry.adminUsername,
        password: registry.adminPassword,
    },
});

const getStartedApp = new azure.appservice.AppService("get-started", {
    resourceGroupName: resourceGroup.name,
    appServicePlanId: plan.id,
    appSettings: {
      WEBSITES_ENABLE_APP_SERVICE_STORAGE: "false",
      DOCKER_REGISTRY_SERVER_URL: pulumi.interpolate`https://${registry.loginServer}`,
      DOCKER_REGISTRY_SERVER_USERNAME: registry.adminUsername,
      DOCKER_REGISTRY_SERVER_PASSWORD: registry.adminPassword,
      WEBSITES_PORT: "80", // Our custom image exposes port 80. Adjust for your app as needed.
    },
    siteConfig: {
        alwaysOn: true,
        linuxFxVersion: pulumi.interpolate`DOCKER|${myImage.imageName}`,
    },
    httpsOnly: true,
});

export const getStartedEndpoint = pulumi.interpolate`https://${getStartedApp.defaultSiteHostname}`;
