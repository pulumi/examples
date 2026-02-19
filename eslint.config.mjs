// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import header from "eslint-plugin-header";

// eslint-plugin-header requires this workaround for flat config
// See: https://github.com/Stuk/eslint-plugin-header/issues/57
header.rules.header.meta.schema = false;

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            "**/node_modules/**",
            "**/bin/**",
            "**/dist/**",
            "**/venv/**",
        ],
    },
    // Main config for TS/JS files
    {
        files: ["**/*.ts", "**/*.js"],
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "@stylistic": stylistic,
            "header": header,
        },
        languageOptions: {
            parser: tseslint.parser,
        },
        rules: {
            // Copyright header — matches existing line-comment format:
            //   // Copyright 2016-2025, Pulumi Corporation.  All rights reserved.
            "header/header": ["error", "line", [
                { "pattern": " Copyright (\\d{4}-)?\\d{4}, Pulumi Corporation\\." },
            ]],

            // Formatting (via @stylistic — these were in TSLint core)
            // Note: no indent size rule — TSLint only enforced spaces-not-tabs
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/spaced-comment": ["error", "always"],
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/type-annotation-spacing": "error",

            // ESLint core rules (1:1 TSLint mappings)
            "curly": "error",
            "no-eval": "error",
            "no-debugger": "error",
            "no-var": "error",
            "prefer-const": "error",
            "eqeqeq": ["error", "always", { "null": "ignore" }],
            "no-caller": "error",
            "no-new-wrappers": "error",
            "guard-for-in": "error",
            "radix": "error",
            "default-case": "error",
            "no-fallthrough": "error",
            "no-empty": "error",
            "sort-imports": ["error", { ignoreDeclarationSort: true }],
            "no-console": ["error", { allow: ["log", "warn", "error"] }],

            // TypeScript-specific rules
            "@typescript-eslint/no-redeclare": "error",
            "@typescript-eslint/no-unused-expressions": "error",
            "@typescript-eslint/no-namespace": "error",
            "@typescript-eslint/member-ordering": "error",
        },
    },
);
