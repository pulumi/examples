// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import { AksCluster } from "./cluster";
import { KedaService, KedaStorageQueueHandler } from "./keda";

// Define the resource group to contain all resources
const resourceGroup = new azure.core.ResourceGroup("keda-pulumi");

// Create an AKS K8s cluster
const aks = new AksCluster("keda-cluster", {
    resourceGroupName: resourceGroup.name,
    kubernetesVersion: "1.26.3",
    vmSize: "Standard_B2s",
    vmCount: 3,
});

// Deploy shared components of KEDA (container registry, kedacore/keda-edge Helm chart)
const service = new KedaService("keda-edge", {
    resourceGroup,
    k8sProvider: aks.provider,
});

// Create the storage account and the storage queue to listen to
const storageAccount = new azure.storage.Account("kedapulumi", {
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});
const queue = new azure.storage.Queue("kedaqueue", {
    storageAccountName: storageAccount.name,
});

// Deploy a Function App which subscribes to the Storage Queue
const app = new KedaStorageQueueHandler("queue-handler", {
    resourceGroup,
    service,
    storageAccount,
    queue,
    path: "./functionapp",
});

// Output the cluster name and .kube/config
export const clusterName = aks.cluster.name;
export const kubeConfig = aks.cluster.kubeConfigRaw;
export const storageAccountName = storageAccount.name;
export const queueName = queue.name;
