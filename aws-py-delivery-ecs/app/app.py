import os
import signal
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


class Hello(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"Hello from Pulumi Delivery!\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


port = int(os.environ.get("PORT", "8080"))
server = HTTPServer(("", port), Hello)
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
print(f"Listening on port {port}", flush=True)
server.serve_forever()
