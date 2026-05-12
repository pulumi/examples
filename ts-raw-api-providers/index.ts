// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import { HttpbinEcho } from "./httpbinEcho.js";

const config = new pulumi.Config();
const message = config.get("message") ?? "hello from a Pulumi dynamic provider";

// ---------------------------------------------------------------------------
// Pattern 1 — Dynamic Provider.
// Full create/read/update/delete lifecycle, tracked in Pulumi state.
// Drives the public https://httpbin.org/anything echo API.
// ---------------------------------------------------------------------------
const echo = new HttpbinEcho("greeting", {
    payload: { message, source: "pulumi-dynamic-provider" },
});

// ---------------------------------------------------------------------------
// Pattern 2 — @pulumi/command.
// No state of the remote object — just shells out a create command.
// Good when you only need a one-shot effect.
// ---------------------------------------------------------------------------
const zen = new command.local.Command("github-zen", {
    create: "curl -fsS --max-time 5 https://api.github.com/zen || echo 'offline'",
});

export const echoUrl = echo.url;
export const echoEtag = echo.etag;
export const echoLastMethod = echo.lastMethod;
export const echoTraceId = echo.traceId;
export const echoedBody = echo.echoedBody;
export const githubZen = zen.stdout;
