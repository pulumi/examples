from xpresso.testclient import TestClient

from app.main import app
from app.db import ConnectionHealth


def test_health() -> None:
    class FakeHealth(ConnectionHealth):
        def __init__(self) -> None:
            pass
        async def is_connected(self) -> bool:
            return True

    with app.dependency_overrides as overrides:
        overrides[ConnectionHealth] = FakeHealth

        client = TestClient(app)
        resp = client.get("/health")

        assert resp.status_code == 200, resp.content
        assert resp.json() == {"db": {"connected": True}}
