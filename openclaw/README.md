# OpenClaw with Pulumi and TypeScript

Deploy [OpenClaw](https://docs.openclaw.ai/) on a cloud virtual machine with Tailscale for secure HTTPS access. Each Pulumi program provisions the required infrastructure, installs OpenClaw via cloud-init, and configures Tailscale Serve as a secure reverse proxy.

This directory contains one deployable Pulumi project per cloud provider:

- [openclaw-azure-typescript/](./openclaw-azure-typescript) — deploy OpenClaw on an Azure Virtual Machine.
- [openclaw-aws-typescript/](./openclaw-aws-typescript) — deploy OpenClaw to AWS with a VPC, security groups, and an EC2 instance.
- [openclaw-hetzner-typescript/](./openclaw-hetzner-typescript) — deploy OpenClaw to Hetzner Cloud with a firewall and server.
