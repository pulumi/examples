import asyncio

import uvicorn  # type: ignore[import]
from xpresso import App

from app.config import Config
from app.lifespan import lifespan
from app.logconfig import get_json_logconfig
from app.routes import routes


app = App(routes=routes, lifespan=lifespan)


async def main() -> None:
    config = Config()  # type: ignore  # for Pylance
    app.dependency_overrides[Config] = lambda: config
    log_config = get_json_logconfig(config.log_level)
    server_config = uvicorn.Config(
        app,
        port=config.app_port,
        host=config.app_host,
        log_config=log_config,
    )
    server = uvicorn.Server(server_config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
