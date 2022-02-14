from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.dependencies import InjectDBHealth


@asynccontextmanager
async def lifespan(db_health: InjectDBHealth) -> AsyncGenerator[None, None]:
    if not (await db_health.is_connected()):
        raise RuntimeError("Failed to connect to DB")
    yield
