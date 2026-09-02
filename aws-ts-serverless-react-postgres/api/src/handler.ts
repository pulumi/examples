// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import { getPool } from "./db";

export interface HandlerResult {
    status: number;
    body: string;
    headers: Record<string, string>;
}

export async function handle(path: string): Promise<HandlerResult> {
    const jsonHeaders = { "content-type": "application/json" };
    if (path === "/api/random" || path === "/random") {
        const pool = await getPool();
        const result = await pool.query<{ n: number }>("SELECT floor(random()*100)::int AS n");
        return {
            status: 200,
            body: JSON.stringify({ n: result.rows[0].n }),
            headers: jsonHeaders,
        };
    }
    return {
        status: 404,
        body: JSON.stringify({ error: "not found", path }),
        headers: jsonHeaders,
    };
}
