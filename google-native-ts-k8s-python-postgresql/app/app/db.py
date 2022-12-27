from typing import NamedTuple, Protocol

import asyncpg  # type: ignore[import]


class ConnectionHealth(Protocol):
    async def is_connected(self) -> bool:
        ...


class PostgresConnectionHealth(NamedTuple):
    pool: asyncpg.Pool

    async def is_connected(self) -> bool:
        conn: asyncpg.Connection
        async with self.pool.acquire() as conn:  # type: ignore
            return await conn.fetchval("SELECT 1") == 1  # type: ignore
