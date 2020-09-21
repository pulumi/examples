// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import * as containerregistry from "@pulumi/azure-nextgen/containerregistry/latest";
import * as resources from "@pulumi/azure-nextgen/resources/latest";
import * as web from "@pulumi/azure-nextgen/web/latest";

const config = new pulumi.Config();
const location = config.get("location") || "WestUS";

const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName: "appservice-docker-rg",
    location: location,
});

const plan = new web.AppServicePlan("plan", {
    resourceGroupName: resourceGroup.name,
    name: "linux-asp",
    location: resourceGroup.location,
    kind: "Linux",
    reserved: true,
    sku: {
        name: "B1",
        tier: "Basic",
    },
});

const suffix = new random.RandomString("suffix", {
    length: 6,
    special: false,
    upper: false,
});

//
// Scenario 1: deploying an image from Docker Hub.
// The example uses a HelloWorld application written in Go.
// Image: https://hub.docker.com/r/microsoft/azure-appservices-go-quickstart/
//
const imageInDockerHub = "microsoft/azure-appservices-go-quickstart";

const helloApp = new web.WebApp("helloApp", {
    resourceGroupName: resourceGroup.name,
    location: plan.location,
    name: pulumi.interpolate`hello-app-${suffix.result}`,
    serverFarmId: plan.id,
    siteConfig: {
        appSettings: [{
            name: "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
            value: "false",
        }],
        alwaysOn: true,
        linuxFxVersion: `DOCKER|${imageInDockerHub}`,
    },
    httpsOnly: true,
});

export const helloEndpoint = pulumi.interpolate`https://${helloApp.defaultHostName}/hello`;

//
// Scenario 2: deploying a custom image from Azure Container Registry.
//
const customImage = "node-app";
const registry = new containerregistry.Registry("registry", {
    resourceGroupName: resourceGroup.name,
    registryName: pulumi.interpolate`registry${suffix.result}`,
    location: resourceGroup.location,
    sku: {
        name: "Basic",
    },
    adminUserEnabled: true,
});

const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(
    ([resourceGroupName, registryName]) => containerregistry.listRegistryCredentials({
        resourceGroupName: resourceGroupName,
        registryName: registryName,
}));
const adminUsername = credentials.apply(credentials => credentials.username!);
const adminPassword = credentials.apply(credentials => credentials.passwords![0].value!);

const myImage = new docker.Image(customImage, {
    imageName: pulumi.interpolate`${registry.loginServer}/${customImage}:v1.0.0`,
    build: { context: `./${customImage}` },
    registry: {
        server: registry.loginServer,
        username: adminUsername,
        password: adminPassword,
    },
});

const getStartedApp = new web.WebApp("getStartedApp", {
    resourceGroupName: resourceGroup.name,
    location: plan.location,
    name: pulumi.interpolate`get-started-${suffix.result}`,
    serverFarmId: plan.id,
    siteConfig: {
        appSettings: [
            {
                name: "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
                value: "false",
            },
            {
                name: "DOCKER_REGISTRY_SERVER_URL",
                value: pulumi.interpolate`https://${registry.loginServer}`,
            },
            {
                name: "DOCKER_REGISTRY_SERVER_USERNAME",
                value: adminUsername,
            },
            {
                name: "DOCKER_REGISTRY_SERVER_PASSWORD",
                value: adminPassword,
            },
            {
                name: "WEBSITES_PORT",
                value: "80", // Our custom image exposes port 80. Adjust for your app as needed.
            },
        ],
        alwaysOn: true,
        linuxFxVersion: pulumi.interpolate`DOCKER|${myImage.imageName}`,
    },
    httpsOnly: true,
});

export const getStartedEndpoint = pulumi.interpolate`https://${getStartedApp.defaultHostName}`;
