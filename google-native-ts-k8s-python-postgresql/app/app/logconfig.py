import logging
from typing import Any, Callable, Literal

from orjson import dumps
from pythonjsonlogger.jsonlogger import JsonFormatter  # type: ignore[import]


def _json_dumps(
    data: Any, default: Callable[[Any], Any] | None = None, **_: Any
) -> str:
    return dumps(data, default=default).decode()


class _FilterUvicornColorLogs(logging.Filter):
    """Remove color_log message from Uvicorn logs"""

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
        "filters": {"filter_colorlogs": {"()": _FilterUvicornColorLogs}},
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "json",
                "stream": "ext://sys.stdout",
                "filters": ["filter_colorlogs"],
            }
        },
        "root": {"level": log_level, "handlers": ["console"]},
    }
