// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { Config } from "@pulumi/pulumi";

const config = new Config();

// Machine type for the gVisor sandbox node pool. gVisor needs Container-Optimized
// OS and at least 2 vCPU; e2-standard-4 gives agents real headroom.
export const nodeMachineType = config.get("nodeMachineType") || "e2-standard-4";

// Nodes in the gVisor sandbox pool.
export const sandboxNodeCount = config.getNumber("sandboxNodeCount") || 1;

// Nodes in the default (system/controller) pool. These run the agent-sandbox
// controller and other cluster services on a normal, unsandboxed runtime.
export const systemNodeCount = config.getNumber("systemNodeCount") || 1;

// Which release of kubernetes-sigs/agent-sandbox to install.
// Pin this to a real release tag — see https://github.com/kubernetes-sigs/agent-sandbox/releases
export const agentSandboxVersion = config.get("agentSandboxVersion") || "v0.5.2";

// GKE control-plane version. Defaults to the latest available.
export const masterVersion = config.get("masterVersion") ||
    gcp.container.getEngineVersions().then(v => v.latestMasterVersion);
