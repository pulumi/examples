// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist",
        sourcemap: false,
    },
});
