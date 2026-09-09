// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

// Import the program's configuration settings.
const config = new pulumi.Config();
const accountId = config.require("accountId");

// A D1 (serverless SQLite) database to store visits.
const db = new cloudflare.D1Database("db", {
    accountId: accountId,
    name: "visits-db",
});

// A Cloudflare Worker, exposed on its workers.dev subdomain.
const worker = new cloudflare.Worker("worker", {
    accountId: accountId,
    name: "d1-app",
    subdomain: {
        enabled: true,
    },
});

// A version of the Worker containing the code (worker.js) and its D1 binding.
const version = new cloudflare.WorkerVersion("version", {
    accountId: accountId,
    workerId: worker.id,
    compatibilityDate: "2025-01-01",
    mainModule: "worker.js",
    bindings: [{
        name: "DB",
        type: "d1",
        databaseId: db.uuid,
    }],
    modules: [{
        name: "worker.js",
        contentType: "application/javascript+module",
        contentFile: "worker.js",
    }],
});

// Deploy the version so it serves all of the application's traffic.
const deployment = new cloudflare.WorkersDeployment("deployment", {
    accountId: accountId,
    scriptName: worker.name,
    strategy: "percentage",
    versions: [{
        versionId: version.id,
        percentage: 100,
    }],
});

// Export the application's URL.
export const url = worker.subdomain.url;
