// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const username = config.require("username");
const password = config.require("password");

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("spark-rg");

// Create a storage account and a container for Spark
const storageAccount = new azure.storage.Account("sparksa", {
    resourceGroupName: resourceGroup.name,
    accountReplicationType: "LRS",
    accountTier: "Standard",
});

const storageContainer = new azure.storage.Container("spark", {
    storageAccountName: storageAccount.name,
    containerAccessType: "private",
});

// Create a Spark cluster in HDInsight
const sparkCluster = new azure.hdinsight.SparkCluster("myspark", {
    resourceGroupName: resourceGroup.name,
    clusterVersion: "3.6",
    componentVersion: {
        spark: "2.3",
    },
    tier: "Standard",
    storageAccounts: [{
        isDefault: true,
        storageAccountKey: storageAccount.primaryAccessKey,
        storageContainerId: storageContainer.id,
    }],
    gateway: {
        enabled: true,
        username,
        password,
    },
    roles: {
        headNode: {
            vmSize: "Standard_D12_v2",
            username,
            password,
        },
        workerNode: {
            targetInstanceCount: 3,
            vmSize: "Standard_D12_v2",
            username,
            password,
        },
        zookeeperNode: {
            vmSize: "Standard_D12_v2",
            username,
            password,
        },
    },
});

// Export the endpoint
export const endpoint = pulumi.interpolate`https://${sparkCluster.httpsEndpoint}/`;
