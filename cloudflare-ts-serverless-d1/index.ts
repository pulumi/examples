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

// The Worker's code: records each visit in D1 and returns the running total.
const script = `export default {
    async fetch(request, env, ctx) {
        await env.DB.prepare(
            "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, visited_at TEXT)"
        ).run();
        await env.DB.prepare("INSERT INTO visits (visited_at) VALUES (?1)")
            .bind(new Date().toISOString())
            .run();
        const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM visits").first();
        return new Response("Hello, world! This page has been visited " + row.count + " times.");
    },
};
`;

// A Cloudflare Worker, exposed on its workers.dev subdomain.
const worker = new cloudflare.Worker("worker", {
    accountId: accountId,
    name: "d1-app",
    subdomain: {
        enabled: true,
    },
});

// A version of the Worker containing the code and its D1 binding.
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
        contentBase64: Buffer.from(script).toString("base64"),
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
