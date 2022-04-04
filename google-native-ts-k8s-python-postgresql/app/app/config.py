from pydantic import BaseSettings, SecretStr


class Config(BaseSettings):
    app_port: int
    app_host: str
    db_username: str
    db_password: SecretStr | None = None
    db_host: str
    db_port: int
    db_database_name: str
