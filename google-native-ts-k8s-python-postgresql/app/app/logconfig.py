import logging
from typing import Any, Callable, Literal

from pythonjsonlogger.jsonlogger import JsonFormatter  # type: ignore[import]
from orjson import dumps
from uvicorn.config import LOGGING_CONFIG  # type: ignore[import]


def _json_dumps(data: Any, default: Callable[[Any], Any] | None = None, **_) -> str:
    return dumps(data, default=default).decode()


class _FilterUvicornColorLogs(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.__dict__.pop("color_message", None)
        return True


def get_json_logconfig(
    log_level: Literal["INFO", "DEBUG"],
) -> dict[str, Any]:
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": JsonFormatter,
                "timestamp": True,
                "json_serializer": _json_dumps,
            },
        },
        "filters": {
            "filter_colorlogs": {"()": _FilterUvicornColorLogs}
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "json",
                "stream": "ext://sys.stdout",
                "filters": ["filter_colorlogs"]
            }
        },
        "root": {"level": log_level, "handlers": ["console"]},
    }


def get_plaintext_logconfig(
    log_level: Literal["INFO", "DEBUG"],
) -> dict[str, Any]:
    return {
        **LOGGING_CONFIG,
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "timestamped": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "timestamped",
                "stream": "ext://sys.stdout",
            }
        },
        "root": {"level": log_level, "handlers": ["console"]},
    }
