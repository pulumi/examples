// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import { agentSandboxVersion } from "./config";
import { k8sProvider } from "./cluster";

// Install kubernetes-sigs/agent-sandbox from its release artifacts. Each release
// ships two manifests:
//   - manifest.yaml   -> the Sandbox CRD (agents.x-k8s.io/v1beta1) + controller
//   - extensions.yaml -> SandboxTemplate / SandboxClaim / SandboxWarmPool CRDs
// These are the same files the project tells you to `kubectl apply`, except here
// Pulumi owns their lifecycle: `pulumi up` installs them, `pulumi destroy`
// removes them, and they're version-pinned like everything else.
const base =
    `https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${agentSandboxVersion}`;

export const agentSandbox = new k8s.yaml.v2.ConfigGroup("agent-sandbox", {
    files: [
        `${base}/manifest.yaml`,
        `${base}/extensions.yaml`,
    ],
}, { provider: k8sProvider });
