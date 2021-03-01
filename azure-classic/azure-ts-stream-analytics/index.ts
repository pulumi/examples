// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";
import { createSharedAccessToken } from "./token";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("streams-rg");

// Define an Event Hub Namespace with two Hubs for an input and an output data streams
const namespace = new azure.eventhub.EventHubNamespace("streams-ns", {
    resourceGroupName: resourceGroup.name,
    sku: "standard",
});

const inputHub = new azure.eventhub.EventHub("inputs", {
    resourceGroupName: resourceGroup.name,
    namespaceName: namespace.name,
    partitionCount: 2,
    messageRetention: 7,
});

const consumerGroup = new azure.eventhub.EventHubConsumerGroup("analytics", {
    resourceGroupName: resourceGroup.name,
    namespaceName: namespace.name,
    eventhubName: inputHub.name,
});

const outputHub = new azure.eventhub.EventHub("outputs", {
    resourceGroupName: resourceGroup.name,
    namespaceName: namespace.name,
    partitionCount: 2,
    messageRetention: 7,
});

// Create a Stream Analytics Job that aggregates events per Make and 1-minute intervals
const job = new azure.streamanalytics.Job("job", {
    resourceGroupName: resourceGroup.name,
    compatibilityLevel: "1.1",
    dataLocale: "en-GB",
    eventsLateArrivalMaxDelayInSeconds: 60,
    eventsOutOfOrderMaxDelayInSeconds: 50,
    eventsOutOfOrderPolicy: "Adjust",
    outputErrorPolicy: "Drop",
    streamingUnits: 1,
    transformationQuery: `
SELECT
    Make,
    SUM(Sales) AS Sales
INTO
    [MyOutput]
FROM
    [MyInput] TIMESTAMP BY Time
GROUP BY
    Make,
    TumblingWindow(minute, 1)
`,
});

// Input of the job: the Event Hub with raw events
const input = new azure.streamanalytics.StreamInputEventHub("input", {
    name: "MyInput",
    resourceGroupName: resourceGroup.name,
    streamAnalyticsJobName: job.name,
    servicebusNamespace: namespace.name,
    eventhubName: inputHub.name,
    eventhubConsumerGroupName: consumerGroup.name,
    sharedAccessPolicyKey: namespace.defaultPrimaryKey,
    sharedAccessPolicyName: "RootManageSharedAccessKey",
    serialization: {
        type: "Json",
        encoding: "UTF8",
    },
});

// Output of the job: the Event Hub with aggregated data
const output = new azure.streamanalytics.OutputEventHub("output", {
    name: "MyOutput",
    resourceGroupName: resourceGroup.name,
    streamAnalyticsJobName: job.name,
    servicebusNamespace: namespace.name,
    eventhubName: outputHub.name,
    sharedAccessPolicyKey: namespace.defaultPrimaryKey,
    sharedAccessPolicyName: "RootManageSharedAccessKey",
    serialization: {
        type: "Json",
        encoding: "UTF8",
        format: "Array",
    },
});

// Create an Azure Function to subscribe to the output and print all outputs of the job
outputHub.onEvent("analytics-output", {
    callback: async (context, event) => {
        console.log(JSON.stringify(event));
    },
});

const url = pulumi.interpolate`https://${namespace.name}.servicebus.windows.net`;
export const sasToken = pulumi.all([url, namespace.defaultPrimaryKey]).apply(([u, pk]) => createSharedAccessToken(u, "RootManageSharedAccessKey", pk));
export const inputEndpoint = pulumi.interpolate`${url}/${inputHub.name}/messages?timeout=60&api-version=2014-01`;
