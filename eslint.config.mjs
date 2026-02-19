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
            // TODO(#2708): Re-enable after the copyright header follow-up cleanup.
            "header/header": "off",

            // Formatting (via @stylistic — these were in TSLint core)
            // Note: no indent size rule — TSLint only enforced spaces-not-tabs
            // TODO(#2709): Re-enable after the auto-fixable formatting follow-up cleanup.
            "@stylistic/quotes": "off",
            "@stylistic/semi": "off",
            "@stylistic/comma-dangle": "off",
            "@stylistic/eol-last": "off",
            "@stylistic/no-trailing-spaces": "off",
            "@stylistic/spaced-comment": "off",
            "@stylistic/brace-style": "off",
            "@stylistic/type-annotation-spacing": "error",

            // ESLint core rules (1:1 TSLint mappings)
            // TODO(#2712): Re-enable after the equality and control-flow follow-up cleanup.
            "curly": "off",
            "no-eval": "error",
            "no-debugger": "error",
            // TODO(#2710): Re-enable after the modern JavaScript follow-up cleanup.
            "no-var": "off",
            "prefer-const": "off",
            "eqeqeq": "off",
            "no-caller": "error",
            "no-new-wrappers": "error",
            "guard-for-in": "error",
            "radix": "error",
            "default-case": "error",
            "no-fallthrough": "error",
            "no-empty": "error",
            // TODO(#2713): Re-enable after the ordering follow-up cleanup.
            "sort-imports": "off",
            "no-console": ["error", { allow: ["log", "warn", "error"] }],

            // TypeScript-specific rules
            "@typescript-eslint/no-redeclare": "error",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-namespace": "error",
            "@typescript-eslint/member-ordering": "off",
        },
    },
);
