from pydantic import BaseModel
from xpresso import Path

from app.db import ConnectionHealth


class DBHealth(BaseModel):
    connected: bool


class Health(BaseModel):
    db: DBHealth


async def health(db_health: ConnectionHealth) -> Health:
    """Verify that the app is responding to requests and connected to the database"""
    return Health(db=DBHealth(connected=await db_health.is_connected()))


routes = [
    Path(
        "/health",
        get=health,
    )
]
