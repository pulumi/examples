// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import { agentSandboxVersion } from "./config";
import { k8sProvider } from "./cluster";

// Install kubernetes-sigs/agent-sandbox from its release artifacts. As of
// v0.5.2, each release ships an all-in-one sandbox-with-extensions.yaml: the
// Sandbox CRD (agents.x-k8s.io/v1beta1) + controller, plus the SandboxTemplate /
// SandboxClaim / SandboxWarmPool extension CRDs. (Earlier releases split this
// into manifest.yaml and extensions.yaml.)
// This is the same file the project tells you to `kubectl apply`, except here
// Pulumi owns its lifecycle: `pulumi up` installs it, `pulumi destroy`
// removes it, and it's version-pinned like everything else.
const base =
    `https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${agentSandboxVersion}`;

export const agentSandbox = new k8s.yaml.v2.ConfigGroup("agent-sandbox", {
    files: [`${base}/sandbox-with-extensions.yaml`],
}, { provider: k8sProvider });
