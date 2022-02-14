import asyncpg  # type: ignore[import]


class ConnectionHealth:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool
    
    async def is_connected(self) -> bool:
        conn: asyncpg.Connection
        async with self.pool.acquire() as conn:
            return await conn.fetchval("SELECT 1") == 1  # type: ignore
