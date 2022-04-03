from xpresso.testclient import TestClient

from app.main import create_app
from app.db import ConnectionHealth


def test_health() -> None:
    class DBHealthStub:
        async def is_connected(self) -> bool:
            return True

    app = create_app(DBHealthStub())

    with app.dependency_overrides as overrides:
        overrides[ConnectionHealth] = DBHealthStub

        with TestClient(app) as client:
            resp = client.get("/health")
            assert resp.status_code == 200, resp.content
        assert resp.json() == {"db": {"connected": True}}
