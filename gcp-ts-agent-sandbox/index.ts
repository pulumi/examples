// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import { Developer, operator, sandboxAcl } from "./tailscale";
import { cluster, k8sProvider, kubeconfig } from "./cluster";
import { AgentSandbox } from "./agentSandboxComponent";
import { agentSandbox } from "./agentSandbox";

const config = new pulumi.Config();

// The sandboxes to create, one per developer. This is a value the program reads
// at runtime, so the same shape could just as easily come from a GitHub team or
// a query for whoever currently has a session open. "One sandbox per active
// developer" is a program, not a static manifest.
const developers = config.requireObject<Developer[]>("developers");

// Who may open which box, derived from the same list. This must exist before the
// operator tries to tag a device with `tag:sbx-<name>`: a tag nobody owns is a
// tag the operator can't apply.
const acl = sandboxAcl(developers);

// The Claude Code OAuth blob mounted into each sandbox, kept encrypted in stack
// config rather than in YAML. This demo points every sandbox at one set of
// credentials because there is one developer; in a real deployment this is a
// lookup per owner, so one leaked box compromises only that owner's token.
const credentials = config.requireSecret("claudeCredentials");
const claudeJson = config.requireSecret("claudeJson");

export const sandboxes = developers.map(dev => new AgentSandbox(`sbx-${dev.name}`, {
    owner: dev.name,
    credentials,
    claudeJson,
    prompt: "You are running inside a disposable sandbox. Write a file called " +
        "REPORT.md in your workspace that states which kernel you are running " +
        "on (look at /proc/version), and whether you are in a container or a VM. " +
        "Quote the evidence you used.",
    provider: k8sProvider,
    // The operator and the tag grant both have to exist before any Sandbox CR
    // does, so they're edges in the dependency graph, not README steps.
    dependsOn: [agentSandbox, operator, acl],
}, { dependsOn: [agentSandbox, operator, acl] }));

export const clusterName = cluster.name;
export const sandboxNames = pulumi.all(sandboxes.map(s => s.sandboxName));

// Each box's tailnet address, read back from the operator's Ingress: a MagicDNS
// name with a Let's Encrypt cert, resolvable only by its owner. It's https
// because browsers won't run VS Code's webviews over plain http, even on a
// private network.
export const sandboxUrls = pulumi.all(sandboxes.map(s => s.url));

// `pulumi stack output kubeConfig --show-secrets > kc.yaml`
export const kubeConfig = kubeconfig;
