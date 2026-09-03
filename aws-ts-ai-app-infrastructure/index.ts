// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";
import { AiApp } from "./components/ai-app";

const config = new pulumi.Config();

// The Bedrock foundation model to invoke. Make sure model access is enabled for
// this model in your account and region (Bedrock console -> Model access).
const modelId = config.get("modelId") ?? "anthropic.claude-haiku-4-5-20251001-v1:0";

const app = new AiApp("ai-app", {
    namePrefix: `${pulumi.getProject()}-${pulumi.getStack()}`,
    modelId,
    tags: {
        Project: "ai-app-infrastructure",
        Environment: pulumi.getStack(),
    },
});

export const endpointUrl = app.endpointUrl;
export const logResource = app.logResource;
export const runtimeIdentity = app.runtimeIdentity;
