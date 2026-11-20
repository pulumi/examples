// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import com.sun.net.httpserver.HttpServer;

void main() throws IOException {
    var port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    var body = "Hello from Pulumi Delivery!\n".getBytes(StandardCharsets.UTF_8);

    var server = HttpServer.create(new InetSocketAddress(port), 0);
    server.createContext("/", exchange -> {
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        try (var out = exchange.getResponseBody()) {
            out.write(body);
        }
    });
    server.start();
    IO.println("Listening on port " + port);
}
