"""A stand-in for the Dynamo frontend: a minimal OpenAI-compatible server that
streams a canned answer token by token. For local development of the chat app:

    python tests/stub_llm.py 8000 &
    LLM_BASE_URL=http://127.0.0.1:8000 uvicorn main:app --port 8080
"""

import json
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

ANSWER = (
    "This is a stubbed answer from the local stand-in LLM. Each word arrives as its own "
    "streamed chunk so the page's rendering can be checked without a GPU."
)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/v1/models":
            body = json.dumps(
                {"object": "list", "data": [{"id": "stub", "object": "model"}]}
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)) or 0) or b"{}")
        last = next(
            (m["content"] for m in reversed(req.get("messages", [])) if m["role"] == "user"), ""
        )
        words = (f'You asked: "{last[:60]}". ' + ANSWER).split(" ")
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        for i, w in enumerate(words):
            chunk = {
                "id": "stub",
                "object": "chat.completion.chunk",
                "model": req.get("model"),
                "choices": [{"index": 0, "delta": {"content": (" " if i else "") + w}}],
            }
            self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
            self.wfile.flush()
            time.sleep(0.03)
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"stub LLM listening on :{port}", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
