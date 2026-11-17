"""Chatbot web app: one HTML page plus a streaming proxy to an OpenAI-compatible LLM.

The LLM is NVIDIA Dynamo's frontend (deployed by the Pulumi program at the example root),
reached in-cluster at LLM_BASE_URL. The browser never talks to Dynamo directly:
POST /api/chat forwards the conversation to /v1/chat/completions with stream=true
and relays the tokens back as server-sent events.
"""

import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:8000").rstrip("/")
MODEL_NAME = os.environ.get("MODEL_NAME", "Qwen/Qwen2.5-1.5B-Instruct")
SYSTEM_PROMPT = os.environ.get(
    "SYSTEM_PROMPT",
    "You are a concise, friendly assistant. Answer in plain text, no markdown tables.",
)
MAX_TOKENS = int(os.environ.get("MAX_TOKENS", "512"))
# Shown in the page header so the audience knows what is serving the answers.
SERVED_BY = os.environ.get("SERVED_BY", "NVIDIA Dynamo on AWS EKS")
# Bounds on what is sent back to the model, so a long chat never exceeds the
# server's --max-model-len (8192 tokens, minus MAX_TOKENS for the answer): at
# most HISTORY_TURNS user/assistant pairs, and at most PROMPT_CHAR_BUDGET
# characters of conversation, oldest turns dropped first. The budget is sized
# for the worst case of ~1 token per character (CJK, emoji, dense code).
HISTORY_TURNS = int(os.environ.get("HISTORY_TURNS", "6"))
PROMPT_CHAR_BUDGET = int(os.environ.get("PROMPT_CHAR_BUDGET", "6000"))
# Only for testing: an explicit client bypasses the lifespan-managed pool.
_client: httpx.AsyncClient | None = None

STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """One connection pool to the LLM for the life of the process."""
    global _client
    _client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0))
    try:
        yield
    finally:
        await _client.aclose()
        _client = None


def client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("HTTP client not started (lifespan not running)")
    return _client


app = FastAPI(title="AICR chatbot demo", lifespan=lifespan)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=100_000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=200)


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/info")
async def info():
    """Model and serving details for the page header, plus whether the LLM answers."""
    ready = False
    try:
        r = await client().get(f"{LLM_BASE_URL}/v1/models", timeout=3.0)
        ready = r.status_code == 200
    except httpx.HTTPError:
        pass
    return {"model": MODEL_NAME, "served_by": SERVED_BY, "llm_ready": ready}


def _sse(event: dict) -> bytes:
    return f"data: {json.dumps(event)}\n\n".encode()


def trim_history(
    history: list[dict], turns: int | None = None, char_budget: int | None = None
) -> list[dict]:
    """Keep the latest message plus as many preceding turns as fit both bounds."""
    turns = HISTORY_TURNS if turns is None else turns
    char_budget = PROMPT_CHAR_BUDGET if char_budget is None else char_budget
    kept = history[-(2 * turns + 1) :]
    while len(kept) > 1 and sum(len(m["content"]) for m in kept) > char_budget:
        kept = kept[1:]
    if kept and len(kept[-1]["content"]) > char_budget:
        kept[-1] = {**kept[-1], "content": kept[-1]["content"][-char_budget:]}
    return kept


def _delta_of(line: str) -> str | None:
    """Content delta from one upstream SSE line, or None if the line carries none."""
    if not line.startswith("data:"):
        return None
    data = line[5:].strip()
    if not data or data == "[DONE]":
        return None
    chunk = json.loads(data)
    choices = chunk.get("choices") if isinstance(chunk, dict) else None
    if not choices:
        return None
    return choices[0].get("delta", {}).get("content") or None


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Relay a chat completion as a token stream.

    Request body: {"messages": [{"role": "user"|"assistant", "content": "..."}, ...]}
    Response: text/event-stream of {"delta": "..."} events, then {"done": true, ...}.
    Errors are reported in-stream as {"error": "..."} so the page can show them.
    """
    history = [m.model_dump() for m in req.messages]
    if history[-1]["role"] != "user":
        return JSONResponse({"error": "last message must be from the user"}, status_code=400)

    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + trim_history(history),
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
        "stream": True,
    }

    async def relay():
        started = time.monotonic()
        tokens = 0
        try:
            async with client().stream(
                "POST", f"{LLM_BASE_URL}/v1/chat/completions", json=payload
            ) as upstream:
                if upstream.status_code != 200:
                    detail = (await upstream.aread()).decode(errors="replace")[:500]
                    yield _sse({"error": f"LLM returned HTTP {upstream.status_code}: {detail}"})
                    return
                async for line in upstream.aiter_lines():
                    if line.strip() == "data: [DONE]":
                        break
                    delta = _delta_of(line)
                    if delta:
                        tokens += 1
                        yield _sse({"delta": delta})
        except httpx.HTTPError as exc:
            yield _sse({"error": f"could not reach the LLM at {LLM_BASE_URL}: {exc}"})
            return
        except Exception as exc:  # malformed upstream stream: report it, don't drop the connection
            yield _sse({"error": f"unexpected response from the LLM: {type(exc).__name__}: {exc}"})
            return
        yield _sse(
            {"done": True, "tokens": tokens, "seconds": round(time.monotonic() - started, 2)}
        )

    return StreamingResponse(
        relay(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
