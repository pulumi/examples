// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

/**
 * Dynamic provider that drives the public httpbin.org echo API as if it were
 * a real resource service:
 *
 *   create  → POST   https://httpbin.org/anything
 *   read    → GET    https://httpbin.org/anything   (re-fetch + refresh outputs)
 *   update  → PUT    https://httpbin.org/anything   (in-place change)
 *   delete  → DELETE https://httpbin.org/anything   (best-effort cleanup)
 *
 * Every method body is self-contained because Pulumi serializes the closures
 * and runs them in a separate process — imports happen inside each method.
 */

export interface HttpbinEchoArgs {
    /** Arbitrary JSON-serializable payload sent as the request body. */
    payload: pulumi.Input<Record<string, unknown>>;
}

interface ResolvedInputs {
    payload: Record<string, unknown>;
}

interface ResolvedOutputs extends ResolvedInputs {
    /** Final URL httpbin reported (echoed back). */
    url: string;
    /** SHA-1 of the request body — used as a synthetic etag for change detection. */
    etag: string;
    /** Method the server saw the last write with. */
    lastMethod: string;
    /** Server-supplied trace id (useful for debugging). */
    traceId: string;
    /** The JSON body httpbin echoed back to us on the last create/update. */
    echoedBody: Record<string, unknown> | null;
}

async function callHttpbin(method: "POST" | "PUT" | "GET" | "DELETE", payload?: ResolvedInputs["payload"]) {
    const crypto = await import("node:crypto");
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const res = await fetch("https://httpbin.org/anything", {
        method,
        body,
        headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    if (!res.ok) {
        throw new Error(`httpbin ${method} failed: ${res.status} ${res.statusText}`);
    }
    const echoed = (await res.json()) as {
        url: string;
        method: string;
        json: Record<string, unknown> | null;
        headers: Record<string, string>;
    };
    const etag = body ? crypto.createHash("sha1").update(body).digest("hex") : "";
    return {
        url: echoed.url,
        method: echoed.method,
        json: echoed.json,
        traceId: echoed.headers["X-Amzn-Trace-Id"] ?? "",
        etag,
    };
}

const provider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: ResolvedInputs) {
        const r = await callHttpbin("POST", inputs.payload);
        return {
            id: r.traceId || `httpbin-${Date.now()}`,
            outs: {
                payload: inputs.payload,
                url: r.url,
                etag: r.etag,
                lastMethod: r.method,
                traceId: r.traceId,
                echoedBody: r.json,
            } satisfies ResolvedOutputs,
        };
    },

    async read(id, props) {
        // Re-fetch the resource to keep state in sync with the upstream API.
        const r = await callHttpbin("GET");
        const p = props as ResolvedOutputs;
        return {
            id,
            props: {
                payload: p.payload,
                url: r.url,
                etag: p.etag, // etag is over the request body — unchanged by a read
                lastMethod: p.lastMethod,
                traceId: r.traceId,
                echoedBody: p.echoedBody, // preserve last create/update echo
            } satisfies ResolvedOutputs,
        };
    },

    async update(_id, _olds, news: ResolvedInputs) {
        const r = await callHttpbin("PUT", news.payload);
        return {
            outs: {
                payload: news.payload,
                url: r.url,
                etag: r.etag,
                lastMethod: r.method,
                traceId: r.traceId,
                echoedBody: r.json,
            } satisfies ResolvedOutputs,
        };
    },

    async delete(_id, _props) {
        // Best-effort delete. httpbin is stateless so this just exercises the
        // verb; a real provider would actually remove the upstream object.
        await callHttpbin("DELETE");
    },

    async diff(_id, olds: ResolvedOutputs, news: ResolvedInputs) {
        const changed = JSON.stringify(olds.payload) !== JSON.stringify(news.payload);
        return { changes: changed };
    },
};

/**
 * An "echoed payload" — Pulumi sends `payload` to httpbin and tracks the
 * echoed URL/method/etag in state. Change `payload` → Pulumi calls `update`.
 * Remove the resource → Pulumi calls `delete`.
 */
export class HttpbinEcho extends pulumi.dynamic.Resource {
    public readonly url!: pulumi.Output<string>;
    public readonly etag!: pulumi.Output<string>;
    public readonly lastMethod!: pulumi.Output<string>;
    public readonly traceId!: pulumi.Output<string>;
    public readonly echoedBody!: pulumi.Output<Record<string, unknown> | null>;

    constructor(name: string, args: HttpbinEchoArgs, opts?: pulumi.CustomResourceOptions) {
        super(
            provider,
            name,
            {
                ...args,
                url: undefined,
                etag: undefined,
                lastMethod: undefined,
                traceId: undefined,
                echoedBody: undefined,
            },
            opts,
        );
    }
}
