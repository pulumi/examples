// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as http from "node:http";

const port = Number(process.env.PORT ?? "8080");

const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello from Pulumi Delivery!\n");
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

// Exit promptly when the container is stopped.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
