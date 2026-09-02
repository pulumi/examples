import { Pool } from "pg";

let cachedPool: Pool | undefined;

async function resolveConnectionString(): Promise<string> {
    const direct = process.env.DATABASE_URL;
    if (direct) {
        return direct;
    }
    const resolver = (globalThis as unknown as { __resolveDbUrl?: () => Promise<string> }).__resolveDbUrl;
    if (resolver) {
        return resolver();
    }
    throw new Error("DATABASE_URL is not set and no cloud-specific resolver is registered");
}

export async function getPool(): Promise<Pool> {
    if (cachedPool) {
        return cachedPool;
    }
    const connectionString = await resolveConnectionString();
    cachedPool = new Pool({
        connectionString,
        max: 2,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        ssl: { rejectUnauthorized: false },
    });
    return cachedPool;
}
