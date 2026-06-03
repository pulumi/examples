[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-self-host-gemma4-llm/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-py-self-host-gemma4-llm/README.md#gh-dark-mode-only)

# Self-Host Gemma 4 with Open WebUI and Tailscale

This example deploys Open WebUI to Kubernetes, connects it to a local llama.cpp server running Gemma 4, and can expose the web UI through Tailscale. It is designed for a Mac or workstation where host-native inference is faster and simpler than running the model inside the Kubernetes cluster.

The default model is `unsloth/gemma-4-26B-A4B-it-GGUF` with `gemma-4-26B-A4B-it-MXFP4_MOE.gguf`. The default runtime uses the host machine for inference and k3d for Open WebUI. Tailscale exposure is opt-in so you can preview and deploy the local path before configuring Tailscale credentials.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
1. [Install Python 3.9 or later](https://www.pulumi.com/docs/iac/languages-sdks/python/).
1. Install `kubectl`, [k3d](https://k3d.io/), and [llama.cpp](https://github.com/ggml-org/llama.cpp).
1. To expose Open WebUI through Tailscale, sign in to [Tailscale](https://tailscale.com/) and create OAuth client credentials that can create auth keys.
1. Make sure your machine has enough memory for the selected GGUF model.

## Deploy the App

### Step 1: Start a local Kubernetes cluster

Create a k3d cluster that lets pods reach services running on the host:

```sh
k3d cluster create pulumi-gemma4 \
  --api-port 6550 \
  --agents 1 \
  --port "30000:30000@loadbalancer" \
  --host-alias "host.k3d.internal:host-gateway"
```

### Step 2: Start llama.cpp on the host

Run the OpenAI-compatible llama.cpp server on the host. The example defaults expect port `8080`:

```sh
llama-server \
  --hf-repo unsloth/gemma-4-26B-A4B-it-GGUF \
  --hf-file gemma-4-26B-A4B-it-MXFP4_MOE.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  --ctx-size 8192
```

Check that the server is available:

```sh
curl http://127.0.0.1:8080/v1/models
```

### Step 3: Install Python dependencies

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 4: Configure Pulumi

Create a stack:

```sh
pulumi stack init dev
```

Tailscale exposure is optional. To enable it, set `enableTailscale` and provider credentials. Use either an API key or OAuth credentials supported by the Pulumi Tailscale provider:

```sh
pulumi config set enableTailscale true
pulumi config set tailscale:oauthClientId <client-id>
pulumi config set tailscale:oauthClientSecret <client-secret> --secret
```

If your llama.cpp server uses a different host or port, update the host runtime settings:

```sh
pulumi config set hostLlmHostname host.k3d.internal
pulumi config set hostLlmPort 8080
```

### Step 5: Deploy Open WebUI

```sh
pulumi up
```

Pulumi exports the Open WebUI NodePort URL and the internal LLM base URL. When `enableTailscale` is true, it also exports the Tailscale URL for the web UI.

## Cluster Runtime

The default `runtimeMode` is `host`, which keeps model inference on the host. Linux GPU hosts can run llama.cpp inside Kubernetes instead:

```sh
pulumi config set runtimeMode cluster
pulumi config set gpuVendor nvidia
pulumi config set gpuCount 1
pulumi up
```

Cluster mode downloads the configured GGUF into a persistent volume and runs `llama.cpp` with CUDA or ROCm images.

## Clean Up

Destroy the Pulumi stack:

```sh
pulumi destroy
pulumi stack rm
```

Delete the local k3d cluster:

```sh
k3d cluster delete pulumi-gemma4
```

Stop the local `llama-server` process when you are done.

## Summary

You now have Open WebUI running in Kubernetes and Gemma 4 running through host-native llama.cpp. When `enableTailscale` is true, Pulumi also manages secure remote access through Tailscale.
