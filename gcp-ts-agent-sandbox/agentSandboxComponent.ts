// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as fs from "fs";
import * as k8s from "@pulumi/kubernetes";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import { GVISOR } from "./cluster";
import { tailnetAnnotations } from "./tailscale";

export interface AgentSandboxArgs {
    /** Who this box belongs to. Names the resources and scopes the secret. */
    owner: string;
    /** Work the agent does on boot, before any human opens the IDE. */
    prompt: string;
    /** This owner's Claude Code OAuth blob: {"claudeAiOauth": {...}}. */
    credentials: pulumi.Input<string>;
    /** Onboarding stub, or the interactive TUI opens a browser to log in. */
    claudeJson: pulumi.Input<string>;
    provider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

// The devcontainer definition ships as a ConfigMap rather than a git repo.
// envbuilder's GIT_URL is optional: with none set it builds whatever is at
// WORKSPACE_FOLDER, so the devcontainer lives here, versioned with the program,
// instead of in a public repo the sandbox would have to clone.
const devcontainerDir = path.join(__dirname, "devcontainer");

/**
 * One agent's disposable machine: the Sandbox CR, its persistent workspace, its
 * own credentials, and the egress rules that decide what it can reach.
 *
 * A sandbox is not one object but several that must agree with each other, and
 * "per developer" means creating that whole set N times, which is a loop rather
 * than a static manifest.
 */
export class AgentSandbox extends pulumi.ComponentResource {
    public readonly sandboxName: pulumi.Output<string>;
    /** This sandbox's in-cluster Service. */
    public readonly serviceName: pulumi.Output<string>;
    /** Where its owner opens it: `https://<name>.<tailnet>.ts.net`. */
    public readonly url: pulumi.Output<string>;

    constructor(name: string, args: AgentSandboxArgs, opts?: pulumi.ComponentResourceOptions) {
        super("demo:agent:Sandbox", name, {}, opts);
        const self = { parent: this, provider: args.provider };

        // This owner's credentials, encrypted in state and mounted read-only.
        // Per sandbox, not per cluster: one leaked box is one revoked token.
        const secret = new k8s.core.v1.Secret(`${name}-creds`, {
            metadata: { name: `${name}-creds` },
            stringData: {
                "credentials.json": args.credentials,
                "claude.json": args.claudeJson,
            },
        }, self);

        // The IDE's address inside the cluster. A ClusterIP Service works under
        // gVisor because traffic arrives over the pod's veth into netstack,
        // unlike port-forward's trip through the host's loopback.
        const service = new k8s.core.v1.Service(`${name}-svc`, {
            metadata: { name: `${name}-svc` },
            spec: {
                type: "ClusterIP",
                selector: { "demo.pulumi.com/sandbox": name },
                ports: [{ name: "ide", port: 13337, targetPort: 13337 }],
            },
        }, self);

        // Access is via the tailnet: no public IP and no load balancer. The
        // operator gives this box a MagicDNS name only its owner can resolve and
        // a Let's Encrypt certificate to go with it. It's an Ingress rather than
        // an annotated Service because the certificate matters to the browser;
        // see TAILNET_PORT in tailscale.ts for why VS Code webviews need it.
        const ingress = new k8s.networking.v1.Ingress(`${name}-ingress`, {
            metadata: {
                name: `${name}-ingress`,
                annotations: tailnetAnnotations(name),
            },
            spec: {
                ingressClassName: "tailscale",
                defaultBackend: {
                    service: {
                        name: service.metadata.name,
                        port: { number: 13337 },
                    },
                },
                // The operator takes the hostname from here and appends the
                // tailnet's MagicDNS suffix.
                tls: [{ hosts: [name] }],
            },
        }, { ...self, dependsOn: [service] });

        // Read the address back from the operator rather than assembling it from
        // a hardcoded tailnet suffix: the thing that registered the name is the
        // thing that knows it.
        this.url = ingress.status.apply(s => {
            const host = s?.loadBalancer?.ingress?.[0]?.hostname;
            return host ? `https://${host}` : `https://${name}.<tailnet>.ts.net`;
        });


        const devcontainer = new k8s.core.v1.ConfigMap(`${name}-devcontainer`, {
            metadata: { name: `${name}-devcontainer` },
            data: {
                "devcontainer.json": fs.readFileSync(
                    path.join(devcontainerDir, "devcontainer.json"), "utf8"),
                "entrypoint.sh": fs.readFileSync(
                    path.join(devcontainerDir, "entrypoint.sh"), "utf8"),
            },
        }, self);

        // Default-deny egress, which upstream ships nothing for. The allowlist is
        // "the internet, minus everything private": the agent needs
        // api.anthropic.com, ghcr.io and npm, and has no business reaching the
        // cluster's own network. The 169.254.169.254 exclusion is the node
        // metadata server, i.e. the node's service-account token; an agent left
        // with a route to it is one prompt injection away from the cluster's
        // credentials.
        const netpol = new k8s.networking.v1.NetworkPolicy(`${name}-egress`, {
            metadata: { name: `${name}-egress` },
            spec: {
                podSelector: { matchLabels: { "demo.pulumi.com/sandbox": name } },
                // Egress only: what's bounded is what the agent can reach out to.
                // Inbound is already handled by the tailnet, the only path in.
                policyTypes: ["Egress"],
                egress: [
                    {
                        to: [{
                            ipBlock: {
                                cidr: "0.0.0.0/0",
                                except: [
                                    "10.0.0.0/8",
                                    "172.16.0.0/12",
                                    "192.168.0.0/16",
                                    "169.254.169.254/32",
                                ],
                            },
                        }],
                    },
                    // DNS is inside 10/8, so it needs its own rule: egress rules
                    // are OR'd, and the block above excludes the cluster.
                    {
                        to: [{ namespaceSelector: { matchLabels: { "kubernetes.io/metadata.name": "kube-system" } } }],
                        ports: [
                            { protocol: "UDP", port: 53 },
                            { protocol: "TCP", port: 53 },
                        ],
                    },
                ],
            },
        }, self);

        const sandbox = new k8s.apiextensions.CustomResource(name, {
            apiVersion: "agents.x-k8s.io/v1beta1",
            kind: "Sandbox",
            metadata: { name },
            spec: {
                podTemplate: {
                    metadata: { labels: { "demo.pulumi.com/sandbox": name } },
                    spec: {
                        // The isolation. `GVISOR` is imported from cluster.ts,
                        // the only place the gVisor node pool is defined, so this
                        // cannot ask for a runtime the cluster doesn't have.
                        runtimeClassName: GVISOR,
                        nodeSelector: { "sandbox.gke.io/runtime": GVISOR },
                        tolerations: [{
                            key: "sandbox.gke.io/runtime",
                            operator: "Equal",
                            value: GVISOR,
                            effect: "NoSchedule",
                        }],
                        // envbuilder builds the image as root, then setuids to
                        // devcontainer.json's `containerUser` before running the
                        // entrypoint. Don't set runAsNonRoot: it breaks the
                        // build. fsGroup makes the PVC writable by vscode(1000),
                        // which envbuilder won't chown for us because it didn't
                        // clone the workspace.
                        securityContext: { fsGroup: 1000 },
                        containers: [{
                            name: "devcontainer-main",
                            image: "ghcr.io/coder/envbuilder",
                            resources: {
                                requests: { cpu: "1000m", memory: "2Gi", "ephemeral-storage": "8Gi" },
                                limits: { "ephemeral-storage": "8Gi" },
                            },
                            env: [
                                // No GIT_URL: nothing to clone, the devcontainer
                                // is mounted from the ConfigMap below.
                                { name: "ENVBUILDER_WORKSPACE_FOLDER", value: "/workspaces/demo" },
                                { name: "ENVBUILDER_DEVCONTAINER_DIR", value: "/devcontainer" },
                                // envbuilder only chowns the workspace when it
                                // cloned it; we mount ours, so it stays
                                // root-owned and the unprivileged entrypoint
                                // can't write to it. The setup script fixes this:
                                // it runs as root, before envbuilder drops privileges.
                                {
                                    name: "ENVBUILDER_SETUP_SCRIPT",
                                    value: "mkdir -p /workspaces/demo && chown -R 1000:1000 /workspaces/demo",
                                },
                                // INIT_SCRIPT is an inline `sh -c` string, not a
                                // path, so invoke bash explicitly rather than
                                // depending on the ConfigMap's exec bit.
                                { name: "ENVBUILDER_INIT_SCRIPT", value: "bash /devcontainer/entrypoint.sh" },
                                // /tokens and /devcontainer are mounts, not
                                // source: keep them out of the image build.
                                {
                                    name: "ENVBUILDER_IGNORE_PATHS",
                                    value: "/var/run,/product_uuid,/product_name,/tokens,/devcontainer",
                                },
                                { name: "AGENT_PROMPT", value: args.prompt },
                                { name: "SANDBOX_OWNER", value: args.owner },
                            ],
                            volumeMounts: [
                                { mountPath: "/workspaces", name: "workspaces-pvc" },
                                { mountPath: "/devcontainer", name: "devcontainer", readOnly: true },
                                { mountPath: "/tokens/claude", name: "claude-creds", readOnly: true },
                            ],
                        }],
                        volumes: [
                            { name: "devcontainer", configMap: { name: devcontainer.metadata.name } },
                            { name: "claude-creds", secret: { secretName: secret.metadata.name } },
                        ],
                    },
                },
                // A PVC per sandbox, declared on the Sandbox CR itself. This is
                // what makes suspend/resume worthwhile: the box can go away and
                // the agent's work survives.
                volumeClaimTemplates: [{
                    metadata: { name: "workspaces-pvc" },
                    spec: {
                        accessModes: ["ReadWriteOnce"],
                        resources: { requests: { storage: "10Gi" } },
                    },
                }],
            },
        }, { ...self, dependsOn: [secret, devcontainer, netpol, service, ...(args.dependsOn ?? [])] });

        this.sandboxName = sandbox.metadata.name;
        this.serviceName = service.metadata.name;
        this.registerOutputs({
            sandboxName: this.sandboxName,
            serviceName: this.serviceName,
            url: this.url,
        });
    }
}
