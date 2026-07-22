[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-agent-sandbox/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-agent-sandbox/README.md#gh-dark-mode-only)

# Per-Developer Agent Sandboxes on GKE with Pulumi

A section-by-section walkthrough of this example is in the Pulumi blog post
[Kubernetes Agent Sandbox: what it is and how to deploy it with Pulumi](https://www.pulumi.com/blog/kubernetes-agent-sandbox/).

This example deploys the [kubernetes-sigs/agent-sandbox](https://github.com/kubernetes-sigs/agent-sandbox)
project onto a [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster and
gives each developer a kernel-isolated, disposable coding-agent environment. It stands up:

- A GKE **Standard** cluster with a dedicated [GKE Sandbox (gVisor)](https://cloud.google.com/kubernetes-engine/docs/concepts/sandbox-pods)
  node pool, so every agent pod runs under the gVisor userspace kernel instead of sharing the host kernel.
- The Agent Sandbox controller and CRDs (`Sandbox`, plus the `SandboxTemplate` / `SandboxClaim` /
  `SandboxWarmPool` extensions), installed straight from the upstream release manifests.
- One `Sandbox` per developer, each with its own persistent workspace, its own credentials, and a
  default-deny egress `NetworkPolicy` that keeps the agent off the node metadata server and the cluster's
  private ranges.
- A [Tailscale](https://tailscale.com/) operator and per-sandbox `Ingress`, so each box gets a private
  MagicDNS name and a real certificate that only its owner can reach — no public IP, no load balancer.

The tailnet ACL and the sandboxes are generated from the **same** `developers` list, so "who may open
which box" cannot drift from "which boxes exist."

> **Note:** Agent Sandbox is pre-1.0 (SIG Apps). Pin `agentSandboxVersion` to a real
> [release tag](https://github.com/kubernetes-sigs/agent-sandbox/releases).

## Prerequisites

1. [Install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).
2. A Google Cloud account with the `gcloud` CLI on your path (part of the
   [GCP SDK](https://cloud.google.com/sdk/)), and Pulumi
   [connected to GCP](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). Use a throwaway
   project — these sandboxes are meant to be wrecked.
3. The [`gke-gcloud-auth-plugin`](https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke)
   installed, so the generated kubeconfig can authenticate to the cluster.
4. A [Tailscale](https://tailscale.com/) tailnet with **two** OAuth clients: one for the operator
   (scopes: `devices:core`, `auth_keys`), and one scoped to editing the ACL (scope: `policy_file`).
   See [Tailscale OAuth clients](https://tailscale.com/kb/1215/oauth-clients).
5. A Claude Code OAuth credential blob to run inside the sandboxes (`~/.claude/.credentials.json` and
   `~/.claude.json` from a machine where you've logged into Claude Code).

> **Warning — this example takes over your tailnet ACL.** It manages the tailnet's access-control
> policy as a Pulumi resource: `pulumi up` **overwrites your existing tailnet ACL** with a policy
> generated from the `developers` list, and `pulumi destroy` **resets the ACL to Tailscale's default**.
> Run it against a tailnet you're willing to have rewritten (a personal or test tailnet), not one whose
> ACL you rely on. See the `overwriteExistingContent` / `resetAclOnDestroy` settings in `tailscale.ts`.

## Running the Example

Clone the repo, `cd gcp-ts-agent-sandbox`, and install dependencies:

```bash
$ npm install
```

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

2. Set the GCP project and zone:

    ```bash
    $ pulumi config set gcp:project [your-gcp-project]
    $ pulumi config set gcp:zone us-central1-a
    ```

3. Set the developer list — one sandbox is created per entry:

    ```bash
    $ pulumi config set --path 'developers[0].name' ada
    $ pulumi config set --path 'developers[0].email' ada@example.com
    ```

4. Set the Tailscale OAuth clients (both clients, as secrets):

    ```bash
    $ pulumi config set --secret tailscaleOauthClientId    [operator-client-id]
    $ pulumi config set --secret tailscaleOauthClientSecret [operator-client-secret]
    $ pulumi config set --secret tailscaleAclClientId       [acl-client-id]
    $ pulumi config set --secret tailscaleAclClientSecret   [acl-client-secret]
    ```

5. Set the Claude Code credentials (as secrets):

    ```bash
    $ pulumi config set --secret claudeCredentials "$(cat ~/.claude/.credentials.json)"
    $ pulumi config set --secret claudeJson        "$(cat ~/.claude.json)"
    ```

6. Deploy everything with `pulumi up`. This provisions the cluster, the gVisor pool, the Agent Sandbox
   controller, the Tailscale operator, and one sandbox per developer, in a single gesture:

    ```bash
    $ pulumi up
    ```

7. Once it's up, the tailnet URL for each sandbox is a stack output. Open it in a browser (as the
   Tailscale-authenticated owner) to land in a VS Code IDE with Claude Code installed:

    ```bash
    $ pulumi stack output sandboxUrls
    ```

   To talk to the cluster with `kubectl`:

    ```bash
    $ pulumi stack output kubeConfig --show-secrets > kc.yaml
    $ KUBECONFIG=kc.yaml kubectl get sandboxes
    ```

## Configuration

| Key                            | Description                                                        | Default          |
| ------------------------------ | ------------------------------------------------------------------ | ---------------- |
| `gcp:project`                  | GCP project to deploy into                                         | _(required)_     |
| `gcp:zone`                     | GCP zone                                                           | `us-central1-a`  |
| `developers`                   | JSON array of `{ name, email }`; one sandbox each                  | _(required)_     |
| `nodeMachineType`              | Machine type for the gVisor sandbox pool                           | `e2-standard-4`  |
| `sandboxNodeCount`             | Nodes in the gVisor sandbox pool                                   | `1`              |
| `systemNodeCount`              | Nodes in the default (controller/system) pool                     | `1`              |
| `agentSandboxVersion`          | kubernetes-sigs/agent-sandbox release tag to install              | `v0.5.2`         |
| `masterVersion`                | GKE control-plane version                                          | latest available |
| `tailscaleOauthClientId/Secret`| Tailscale operator OAuth client (secret)                          | _(required)_     |
| `tailscaleAclClientId/Secret`  | Tailscale ACL-editing OAuth client (secret)                       | _(required)_     |
| `claudeCredentials`            | Claude Code OAuth blob mounted into each sandbox (secret)          | _(required)_     |
| `claudeJson`                   | Claude Code `.claude.json` onboarding stub (secret)               | _(required)_     |

## Cleaning Up

```bash
$ pulumi destroy
$ pulumi stack rm dev
```

`pulumi destroy` also restores Tailscale's default ACL, so the tailnet isn't left governed by the rules
of a demo that no longer exists.

## Learn More

For the reasoning behind each piece of this program — why a container alone isn't a security boundary,
what the `Sandbox` CRD actually gives you, and how the gVisor node pool and the tailnet ACL fit together —
read [Kubernetes Agent Sandbox: what it is and how to deploy it with Pulumi](https://www.pulumi.com/blog/kubernetes-agent-sandbox/).
