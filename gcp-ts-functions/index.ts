// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";

/**
 * Deploy a function using the default runtime.
 */
const greeting = new gcp.cloudfunctions.HttpCallbackFunction("greeting", (req, res) => {
    res.send(`Greetings from ${req.body.name || "Google Cloud Functions"}!`);
});

const invoker = new gcp.cloudfunctions.FunctionIamMember("invoker", {
    project: greeting.function.project,
    region: greeting.function.region,
    cloudFunction: greeting.function.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
});

export const url = greeting.httpsTriggerUrl;

/**
 * Deploy a function using an explicitly set runtime.
 */
const runtime = "nodejs14"; // https://cloud.google.com/functions/docs/concepts/exec#runtimes
const explicitRuntimeGreeting = new gcp.cloudfunctions.HttpCallbackFunction(`greeting-${runtime}`, {
    runtime: runtime,
    callback: (req, res) => {
        res.send(`Greetings from ${req.body.name || "Google Cloud Functions"}!`);
    },
});

export const nodejs14Url = explicitRuntimeGreeting.httpsTriggerUrl;
