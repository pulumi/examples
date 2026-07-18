// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as tailscale from "@pulumi/tailscale";
import { k8sProvider } from "./cluster";

const config = new pulumi.Config();

/** A person who gets a sandbox. `name` names the box; `email` is who may open it. */
export interface Developer {
    name: string;
    email: string;
}

// The operator mints tailnet devices on our behalf, so it holds an OAuth client
// rather than a static key: the auth keys it uses expire every 90 days and it
// regenerates them itself. Secrets live in stack config, not in a values file.
const oauthClientId = config.requireSecret("tailscaleOauthClientId");
const oauthClientSecret = config.requireSecret("tailscaleOauthClientSecret");

// The Tailscale operator provides access to the sandboxes without a public IP.
// A gVisor pod cannot be reached with `kubectl port-forward` (GKE lists it as
// incompatible with GKE Sandbox), and an IP allowlist is not access control. The
// tailnet gives each box a name only its owner can resolve, over WireGuard, so
// nothing is exposed on the public internet. The operator's proxy pods run on
// the normal runtime (the gVisor pool's taint keeps them off it) and reach the
// sandbox over ordinary pod networking, which is the path that works under gVisor.
export const operator = new k8s.helm.v3.Release("tailscale-operator", {
    chart: "tailscale-operator",
    namespace: "tailscale",
    createNamespace: true,
    repositoryOpts: { repo: "https://pkgs.tailscale.com/helmcharts" },
    values: {
        oauth: {
            clientId: oauthClientId,
            clientSecret: oauthClientSecret,
        },
        // Devices the operator creates are tagged tag:k8s, owned by
        // tag:k8s-operator. Tagged devices also get key expiry disabled by
        // default, so a sandbox doesn't fall off the tailnet after a few months.
        operatorConfig: { defaultTags: ["tag:k8s-operator"] },
    },
}, { provider: k8sProvider });

/**
 * Annotations for the tailnet Ingress. The hostname comes from the Ingress's
 * `tls.hosts` rather than an annotation; all this adds is the per-box tag.
 *
 * A distinct tag per box is what makes per-developer access expressible: a policy
 * can grant `adam -> tag:sbx-adam` and nothing else. The operator creates one
 * proxy device per Ingress, which is worth remembering against the free tier's
 * 50-tagged-resource ceiling.
 */
export function tailnetAnnotations(hostname: string): { [k: string]: string } {
    return {
        "tailscale.com/tags": `tag:${hostname}`,
    };
}

/**
 * The port the tailnet serves on: 443, not the IDE's 13337.
 *
 * This is a Layer 7 Ingress rather than an annotated Service because of the
 * browser, not the network. A plain Service puts the box on the tailnet at
 * `http://sbx-adam:13337`: private and WireGuard-encrypted, but still not a
 * "secure context" as far as Chrome is concerned, because that judgement keys on
 * the URL scheme, not on whether the network is private. No secure context means
 * no Service Workers and no crypto.subtle, and VS Code webviews need both, so
 * every webview renders blank on a box that otherwise looks healthy. The Ingress
 * makes the operator provision a real Let's Encrypt certificate and MagicDNS
 * name, so the box is reached at `https://sbx-adam.<tailnet>.ts.net` instead.
 */
export const TAILNET_PORT = 443;

// A second OAuth client, scoped to the policy file only. The operator's client
// mints devices but cannot edit access rules; this one edits access rules but
// cannot mint devices. Two credentials because they're two jobs.
const aclProvider = new tailscale.Provider("tailscale-acl", {
    oauthClientId: config.requireSecret("tailscaleAclClientId"),
    oauthClientSecret: config.requireSecret("tailscaleAclClientSecret"),
    tailnet: "-", // the authenticated user's default tailnet
});

/**
 * The tailnet policy, generated from the same list that creates the sandboxes.
 *
 * A sandbox is a box, an isolated runtime, a credential, an egress rule, and a
 * decision about who may open it. Deriving that last decision from the same
 * array that creates the boxes keeps the two from drifting: nobody's box stays
 * reachable after they leave, because deleting a sandbox and revoking access are
 * the same change.
 */
export function accessPolicy(developers: Developer[]): string {
    return JSON.stringify({
        tagOwners: {
            "tag:k8s-operator": [],
            "tag:k8s": ["tag:k8s-operator"],
            // One tag per box, all mintable by the operator.
            ...Object.fromEntries(developers.map(
                d => [`tag:sbx-${d.name}`, ["tag:k8s-operator"]])),
        },
        acls: [
            // Keep people able to reach their own machines; replacing the default
            // policy would otherwise cut you off from your own devices.
            { action: "accept", src: ["autogroup:member"], dst: ["autogroup:self:*"] },
            // The grant: this person, this box, this port. Nothing else.
            ...developers.map(d => ({
                action: "accept",
                src: [d.email],
                dst: [`tag:sbx-${d.name}:${TAILNET_PORT}`],
            })),
        ],
    }, null, 2);
}

export function sandboxAcl(developers: Developer[]): tailscale.Acl {
    return new tailscale.Acl("sandbox-access", {
        acl: accessPolicy(developers),
        // Take ownership of the policy that was hand-typed to bootstrap this.
        overwriteExistingContent: true,
        // On destroy, restore Tailscale's default rather than leaving a tailnet
        // governed by the rules of a demo that no longer exists.
        resetAclOnDestroy: true,
    }, { provider: aclProvider });
}
