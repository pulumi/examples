import asyncio

import asyncpg  # type: ignore[import]
import uvicorn  # type: ignore[import]
from xpresso import App

from app.config import Config
from app.db import ConnectionHealth, PostgresConnectionHealth
from app.routes import routes


def create_app(conn_health: ConnectionHealth) -> App:
    app = App(routes=routes, version=open("VERSION.txt").read().strip())
    app.dependency_overrides[ConnectionHealth] = lambda: conn_health
    return app


async def main() -> None:
    config = Config()  # type: ignore  # values are loaded from env vars
    
    async with asyncpg.create_pool(  # type: ignore
        host=config.db_host,
        port=config.db_port,
        user=config.db_username,
        password=config.db_password,
        database=config.db_database_name,
    ) as pool:
        conn_health = PostgresConnectionHealth(pool)
        app = create_app(conn_health)
        server_config = uvicorn.Config(
            app,
            port=config.app_port,
            host=config.app_host,
        )
        server = uvicorn.Server(server_config)
        await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
