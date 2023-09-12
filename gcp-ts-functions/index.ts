// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";

const greeting = new gcp.cloudfunctions.HttpCallbackFunction("greeting", {
    runtime: "nodejs20", // https://cloud.google.com/functions/docs/concepts/exec#runtimes
    callback: (req: any, res: any) => {
        res.send(`Greetings from ${req.body.name || "Google Cloud Functions"}!`);
    },
});

const invoker = new gcp.cloudfunctions.FunctionIamMember("invoker", {
    project: greeting.function.project,
    region: greeting.function.region,
    cloudFunction: greeting.function.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
});

export const url = greeting.httpsTriggerUrl;

