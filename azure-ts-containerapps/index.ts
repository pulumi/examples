// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as dockerbuild from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi";

import * as app from "@pulumi/azure-native/app";
import * as containerregistry from "@pulumi/azure-native/containerregistry";
import * as operationalinsights from "@pulumi/azure-native/operationalinsights";
import * as resources from "@pulumi/azure-native/resources";

const resourceGroup = new resources.ResourceGroup("rg");

const workspace = new operationalinsights.Workspace("loganalytics", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "PerGB2018",
    },
    retentionInDays: 30,
});

const workspaceSharedKeys = operationalinsights.getSharedKeysOutput({
    resourceGroupName: resourceGroup.name,
    workspaceName: workspace.name,
});

const managedEnv = new app.ManagedEnvironment("env", {
    resourceGroupName: resourceGroup.name,
    appLogsConfiguration: {
        destination: "log-analytics",
        logAnalyticsConfiguration: {
            customerId: workspace.customerId,
            sharedKey: workspaceSharedKeys.apply((r: operationalinsights.GetSharedKeysResult) => r.primarySharedKey!),
        },
    },
});

const registry = new containerregistry.Registry("registry", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Basic",
    },
    adminUserEnabled: true,
});

const credentials = containerregistry.listRegistryCredentialsOutput({
    resourceGroupName: resourceGroup.name,
    registryName: registry.name,
});
const adminUsername = credentials.apply((c: containerregistry.ListRegistryCredentialsResult) => c.username!);
const adminPassword = credentials.apply((c: containerregistry.ListRegistryCredentialsResult) => c.passwords![0].value!);

const customImage = "node-app";
const myImage = new dockerbuild.Image(customImage, {
    imageName: pulumi.interpolate`${registry.loginServer}/${customImage}:v1.0.0`,
    context: { location: "." }` },
    registries: [{
                                address: "",
                                username: "",
                                password: adminPassword
                            }],
});

const containerApp = new app.ContainerApp("app", {
    resourceGroupName: resourceGroup.name,
    managedEnvironmentId: managedEnv.id,
    configuration: {
        ingress: {
            external: true,
            targetPort: 80,
        },
        registries: [{
            server: registry.loginServer,
            username: adminUsername,
            passwordSecretRef: "pwd",
        }],
        secrets: [{
            name: "pwd",
            value: adminPassword,
        }],
    },
    template: {
        containers: [{
            name: "myapp",
            image: myImage.imageName,
        }],
    },
});

export const url = pulumi.interpolate`https://${containerApp.configuration.apply((c: any) => c?.ingress?.fqdn)}`;
