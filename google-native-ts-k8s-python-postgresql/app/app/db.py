from typing import Annotated, AsyncGenerator

import asyncpg  # type: ignore[import]
from app.config import Config
from xpresso import Depends


async def get_pool(config: Config) -> AsyncGenerator[asyncpg.Pool, None]:
    # password is optional:
    # - cloudsql proxy won't work with it
    # - docker run postgres won't work without it
    connection_kwargs = dict(
        host=config.db_host,
        port=config.db_port,
        database=config.db_database_name,
        user=config.db_username,
    )
    if config.db_password is not None:
        connection_kwargs["password"] = config.db_password.get_secret_value()
    async with asyncpg.create_pool(**connection_kwargs) as pool:  # type: ignore
        yield pool


InjectDBConnectionPool = Annotated[asyncpg.Pool, Depends(get_pool, scope="app")]


async def get_connection(
    pool: InjectDBConnectionPool,
) -> AsyncGenerator[asyncpg.Connection, None]:
    async with pool.acquire() as conn:  # type: ignore
        yield conn


InjectDBConnection = Annotated[asyncpg.Connection, Depends(get_connection)]


class ConnectionHealth:
    def __init__(self, pool: InjectDBConnectionPool) -> None:
        self.pool = pool

    async def is_connected(self) -> bool:
        conn: asyncpg.Connection
        async with self.pool.acquire() as conn:  # type: ignore
            return await conn.fetchval("SELECT 1") == 1  # type: ignore


def get_db_health(pool: InjectDBConnectionPool) -> ConnectionHealth:
    return ConnectionHealth(pool)


InjectDBHealth = Annotated[ConnectionHealth, Depends(get_db_health, scope="app")]
