import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as docker from "@pulumi/docker";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("samples", {
    location: "West US",
});

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

export const helloEndpoint = pulumi.interpolate`http://${helloApp.name}.azurewebsites.net/hello`;


/**
 * Scenario 2: deploying a custom image from Azure Container Registry.
 * The example expects a docker application in 'docker-django-webapp-linux' folder.
 * Please check it out from https://github.com/Azure-Samples/docker-django-webapp-linux
 */
const customImage = "docker-django-webapp-linux";

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
      WEBSITES_PORT: 8000, // Our custom image exposes port 8000. Adjust for your app as needed.
    },
    siteConfig: {
        alwaysOn: true,
        linuxFxVersion: pulumi.interpolate`DOCKER|${myImage.imageName}`,
    },
    httpsOnly: true,
});

export const getStartedEndpoint = pulumi.interpolate`http://${getStartedApp.name}.azurewebsites.net`;
