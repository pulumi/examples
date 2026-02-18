# OpenClaw on Azure (Pulumi TypeScript)

Deploy [OpenClaw](https://docs.openclaw.ai/) on an Azure Virtual Machine with Tailscale for secure HTTPS access. This Pulumi program provisions all required Azure infrastructure, installs OpenClaw via cloud-init, and configures Tailscale Serve as a secure reverse proxy.

## Features

- **Automated deployment** -- single `pulumi up` creates everything
- **Tailscale HTTPS** -- gateway binds to localhost; access is through Tailscale Serve only
- **SSH key authentication** -- auto-generated ED25519 key pair, no passwords
- **Minimal attack surface** -- NSG allows SSH inbound only (all other inbound denied)
- **Token-based gateway auth** -- deterministic token generated from Pulumi state

## Prerequisites

1. **Pulumi CLI** installed ([install guide](https://www.pulumi.com/docs/install/))
2. **Azure CLI** authenticated (`az login`)
3. **Tailscale account** with [HTTPS enabled](https://tailscale.com/kb/1153/enabling-https) in the admin console
4. **Tailscale auth key** -- generate a reusable key in the [Tailscale admin](https://login.tailscale.com/admin/settings/keys)
5. **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com/)
6. **Node.js 18+** and npm

## Quick Start

```bash
# Clone and enter the project directory
cd openclaw-azure-typescript

# Install dependencies
npm install

# Create a Pulumi stack
pulumi stack init dev

# Copy the example config and edit it with your secrets
cp Pulumi.dev.yaml.example Pulumi.dev.yaml
# Edit Pulumi.dev.yaml -- fill in anthropicApiKey, tailscaleAuthKey, tailnetDnsName

# Alternatively, set secrets via the CLI:
pulumi config set --secret anthropicApiKey sk-ant-...
pulumi config set --secret tailscaleAuthKey tskey-auth-...
pulumi config set tailnetDnsName tailXXXXX.ts.net

# Deploy
pulumi up
```

After deployment completes, the Tailscale URL with authentication token is printed as an output:

```bash
pulumi stack output tailscaleUrlWithToken --show-secrets
```

## Configuration

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `anthropicApiKey` | Yes (secret) | -- | Anthropic API key for Claude |
| `tailscaleAuthKey` | Yes (secret) | -- | Tailscale auth key (reusable recommended) |
| `tailnetDnsName` | Yes | -- | Your tailnet DNS name (e.g. `tailXXXXX.ts.net`) |
| `vmSize` | No | `Standard_B2s` | Azure VM size |
| `location` | No | `eastus` | Azure region |
| `model` | No | `anthropic/claude-sonnet-4` | LLM model identifier |
| `enableSandbox` | No | `true` | Enable Docker sandbox for code execution |
| `gatewayPort` | No | `18789` | OpenClaw gateway port |
| `browserPort` | No | `18791` | OpenClaw browser port |

### Example `Pulumi.dev.yaml`

```yaml
config:
  openclaw-azure-typescript:vmSize: Standard_B2s
  openclaw-azure-typescript:location: eastus
  openclaw-azure-typescript:anthropicApiKey:
    secure: <your-anthropic-api-key>
  openclaw-azure-typescript:tailscaleAuthKey:
    secure: <your-tailscale-auth-key>
  openclaw-azure-typescript:tailnetDnsName: tailxxxxx.ts.net
  openclaw-azure-typescript:model: anthropic/claude-sonnet-4
  openclaw-azure-typescript:gatewayPort: 18789
  openclaw-azure-typescript:browserPort: 18791
  openclaw-azure-typescript:enableSandbox: true
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Azure Resource Group                       │
│                                                                 │
│  ┌──────────── Virtual Network (10.0.0.0/16) ──────────────┐   │
│  │                                                          │   │
│  │  ┌────────── Subnet (10.0.1.0/24) ──────────────────┐   │   │
│  │  │                                                   │   │   │
│  │  │  ┌─────────────────────────────────────────────┐  │   │   │
│  │  │  │           Virtual Machine (Ubuntu 24.04)    │  │   │   │
│  │  │  │                                             │  │   │   │
│  │  │  │  ┌──────────────┐   ┌──────────────────┐   │  │   │   │
│  │  │  │  │   OpenClaw   │   │    Tailscale     │   │  │   │   │
│  │  │  │  │  Gateway     │◄──│    Serve (HTTPS) │   │  │   │   │
│  │  │  │  │  :18789      │   │    reverse proxy │   │  │   │   │
│  │  │  │  │  (localhost)  │   └──────────────────┘   │  │   │   │
│  │  │  │  └──────────────┘                           │  │   │   │
│  │  │  │                                             │  │   │   │
│  │  │  └─────────────────────────────────────────────┘  │   │   │
│  │  │                                                   │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌───────────────────────────────────┐    │
│  │  Public IP (SSH)  │  │  NSG: Allow SSH (22) inbound only │    │
│  └──────────────────┘  └───────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

User access:  Tailscale HTTPS ──► Tailscale Serve ──► Gateway (localhost:18789)
SSH fallback: SSH (port 22) ──► Public IP ──► VM
```

### Network Topology

- The OpenClaw gateway binds to `127.0.0.1` (localhost only)
- Tailscale Serve acts as an HTTPS reverse proxy from the Tailscale network to localhost
- The NSG only allows SSH (port 22) inbound -- no gateway ports are exposed to the internet
- All outbound traffic is allowed (required for Docker pulls, npm installs, Tailscale, and API calls)

## Cost Estimates

| VM Size | vCPU | RAM | Monthly Cost |
|---------|------|-----|--------------|
| Standard_B2s (default) | 2 | 4 GB | ~$30-35 |
| Standard_D2s_v3 | 2 | 8 GB | ~$70-75 |
| Standard_D2as_v5 | 2 | 8 GB | ~$65-70 |

*Prices are approximate for East US region and include a 30 GB Premium SSD OS disk. Anthropic API costs are separate.*

**Do not use** B1s or A-series VMs -- they have insufficient memory for OpenClaw.

### Cross-Provider Comparison

| Provider | VM Type | vCPU | RAM | Monthly Cost |
|----------|---------|------|-----|--------------|
| **Azure** | Standard_B2s | 2 | 4 GB | ~$30-35 |
| **AWS** | t3.medium | 2 | 4 GB | ~$33 |
| **Hetzner** | cax21 | 4 | 8 GB | ~$7 |

## Accessing Your Instance

### Web UI (Tailscale)

After deployment, get the URL with token:

```bash
pulumi stack output tailscaleUrlWithToken --show-secrets
```

Open this URL in your browser (you must be connected to the same Tailscale network).

### SSH Access

1. Save the private key:
   ```bash
   pulumi stack output privateKey --show-secrets > openclaw-ssh-key
   chmod 600 openclaw-ssh-key
   ```

2. Get the public IP:
   ```bash
   pulumi stack output publicIpAddress
   ```

3. Connect:
   ```bash
   ssh -i openclaw-ssh-key ubuntu@<public-ip>
   ```

   Or via Tailscale SSH (no key needed):
   ```bash
   ssh ubuntu@openclaw
   ```

## Security

- **Gateway isolation**: The gateway listens on `127.0.0.1` only -- it cannot be reached from the internet
- **Tailscale Serve**: Provides HTTPS with automatic TLS certificates via Tailscale
- **Token authentication**: Gateway requires a token (auto-generated and stored in Pulumi state)
- **NSG rules**: Only SSH (port 22) is allowed inbound; consider removing SSH after verifying Tailscale works
- **No password auth**: SSH uses ED25519 key pairs only
- **Secrets management**: API keys are stored as Pulumi secrets (encrypted in state). Consider [Pulumi ESC](https://www.pulumi.com/product/secrets-management/) for team environments
- **Rotate keys**: Periodically rotate your Tailscale auth key and Anthropic API key

## Troubleshooting

### Cloud-init logs

SSH into the VM and check:

```bash
sudo cat /var/log/cloud-init-output.log
```

Cloud-init typically takes 3-5 minutes to complete after the VM starts.

### OpenClaw gateway logs

```bash
journalctl --user -u openclaw-gateway -f
```

### Tailscale status

```bash
tailscale status
sudo journalctl -u tailscaled -f
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Tailscale URL not working | Ensure HTTPS is enabled in [Tailscale admin console](https://login.tailscale.com/admin/dns). Wait for cloud-init to finish. |
| Gateway not starting | Check `journalctl --user -u openclaw-gateway`. Run `openclaw daemon install` manually if needed. |
| SSH connection refused | VM may still be booting. Wait 1-2 minutes after `pulumi up` completes. |
| `tailscale serve` failed | Enable HTTPS certificates in Tailscale admin console first, then run `sudo tailscale serve --bg 18789` on the VM. |
| Cloud-init stuck | SSH in and check `/var/log/cloud-init-output.log`. Docker or npm installs can be slow on small VMs. |
| Permission denied (SSH) | Ensure you saved the private key with `chmod 600` and are connecting as user `ubuntu`. |

## Outputs

| Output | Description |
|--------|-------------|
| `resourceGroupName` | Name of the Azure Resource Group |
| `vmName` | Name of the Virtual Machine |
| `publicIpAddress` | Public IP address of the VM |
| `privateKey` | SSH private key (secret) |
| `gatewayTokenOutput` | Gateway authentication token (secret) |
| `tailscaleUrlWithToken` | Full URL with token for browser access (secret) |
| `sshCommand` | SSH command template |

## Cleanup

Remove all deployed resources:

```bash
pulumi destroy
```

To also remove the stack:

```bash
pulumi stack rm dev
```

## Additional Resources

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [Pulumi Azure Native Provider](https://www.pulumi.com/registry/packages/azure-native/)
- [Azure VM Documentation](https://learn.microsoft.com/en-us/azure/virtual-machines/)
- [Tailscale Serve Documentation](https://tailscale.com/kb/1247/funnel-serve-use-cases)
- [Pulumi ESC (Secrets Management)](https://www.pulumi.com/product/secrets-management/)
