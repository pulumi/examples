import * as pulumi from "@pulumi/pulumi";
import * as compute from "@pulumi/azure-native/compute";
import * as network from "@pulumi/azure-native/network";
import * as resources from "@pulumi/azure-native/resources";
import * as tls from "@pulumi/tls";

// --- Configuration ---

const config = new pulumi.Config();

// Required secrets
const anthropicApiKey = config.requireSecret("anthropicApiKey");
const tailscaleAuthKey = config.requireSecret("tailscaleAuthKey");
const tailnetDnsName = config.require("tailnetDnsName");

// Optional with defaults
const vmSize = config.get("vmSize") ?? "Standard_B2s";
const location = config.get("location") ?? "eastus";
const model = config.get("model") ?? "anthropic/claude-sonnet-4";
const enableSandbox = config.getBoolean("enableSandbox") ?? true;
const gatewayPort = config.getNumber("gatewayPort") ?? 18789;
const browserPort = config.getNumber("browserPort") ?? 18791;

// --- SSH Key & Gateway Token ---

// Generate a deterministic authentication token for the gateway.
// Uses the same pattern as AWS/Hetzner examples: hash an ED25519 public key
// and take the first 48 hex characters.
const gatewayToken = new tls.PrivateKey("openclaw-gateway-token", {
    algorithm: "ED25519",
}).publicKeyOpenssh.apply(key => {
    const hash = require("crypto").createHash("sha256").update(key).digest("hex");
    return hash.substring(0, 48);
});

// Generate SSH key pair for VM access
const sshKey = new tls.PrivateKey("openclaw-ssh-key", {
    algorithm: "ED25519",
});

// --- Azure Resource Group ---

const resourceGroup = new resources.ResourceGroup("openclaw-rg", {
    location: location,
});

// --- Networking ---

const vnet = new network.VirtualNetwork("openclaw-vnet", {
    resourceGroupName: resourceGroup.name,
    location: location,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
    subnets: [{
        name: "openclaw-subnet",
        addressPrefix: "10.0.1.0/24",
    }],
});

// Network Security Group: allow SSH inbound only, all outbound allowed by default
const nsg = new network.NetworkSecurityGroup("openclaw-nsg", {
    resourceGroupName: resourceGroup.name,
    location: location,
    securityRules: [
        {
            name: "AllowSSH",
            priority: 1000,
            direction: network.SecurityRuleDirection.Inbound,
            access: network.SecurityRuleAccess.Allow,
            protocol: network.SecurityRuleProtocol.Tcp,
            sourcePortRange: "*",
            destinationPortRange: "22",
            sourceAddressPrefix: "*",
            destinationAddressPrefix: "*",
        },
    ],
});

// Public IP with DNS label for easy identification
const publicIp = new network.PublicIPAddress("openclaw-pip", {
    resourceGroupName: resourceGroup.name,
    location: location,
    publicIPAllocationMethod: network.IPAllocationMethod.Static,
    sku: {
        name: "Standard",
    },
    dnsSettings: {
        domainNameLabel: pulumi.interpolate`openclaw-${pulumi.getStack()}`,
    },
});

// Network interface: connects VM to subnet, public IP, and NSG
const nic = new network.NetworkInterface("openclaw-nic", {
    resourceGroupName: resourceGroup.name,
    location: location,
    networkSecurityGroup: {
        id: nsg.id,
    },
    ipConfigurations: [{
        name: "openclaw-ipconfig",
        subnet: {
            id: vnet.subnets.apply(subnets => subnets![0].id!),
        },
        privateIPAllocationMethod: network.IPAllocationMethod.Dynamic,
        publicIPAddress: {
            id: publicIp.id,
        },
    }],
});

// --- Cloud-Init User Data ---
// This script is IDENTICAL to the AWS/Hetzner examples.
// Azure delivers it via base64-encoded customData instead of raw userData.

const userData = pulumi.all([tailscaleAuthKey, anthropicApiKey, gatewayToken]).apply(([tsAuthKey, apiKey, gwToken]) => {
    return `#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive

# System updates
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Configure passwordless sudo for ubuntu user
echo "ubuntu ALL=(ALL) NOPASSWD: ALL" | tee /etc/sudoers.d/ubuntu-nopasswd
chmod 440 /etc/sudoers.d/ubuntu-nopasswd

# Install NVM and Node.js for ubuntu user
sudo -u ubuntu bash << 'UBUNTU_SCRIPT'
set -e
cd ~

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Install OpenClaw
npm install -g openclaw@latest

# Add NVM to bashrc if not already there
if ! grep -q 'NVM_DIR' ~/.bashrc; then
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc
fi
UBUNTU_SCRIPT

# Set environment variables for ubuntu user
echo 'export ANTHROPIC_API_KEY="${apiKey}"' >> /home/ubuntu/.bashrc

# Write API key to .openclaw/.env so the daemon can read it
mkdir -p /home/ubuntu/.openclaw
echo 'ANTHROPIC_API_KEY=${apiKey}' > /home/ubuntu/.openclaw/.env
chown -R ubuntu:ubuntu /home/ubuntu/.openclaw
chmod 600 /home/ubuntu/.openclaw/.env

# Install and configure Tailscale
echo "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey="${tsAuthKey}" --ssh || echo "WARNING: Tailscale setup failed. Run 'sudo tailscale up' manually."

# Enable systemd linger for ubuntu user (required for user services to run at boot)
loginctl enable-linger ubuntu

# Start user's systemd instance (required for user services during cloud-init)
systemctl start user@1000.service

# Run OpenClaw onboarding as ubuntu user (skip daemon install, do it separately)
echo "Running OpenClaw onboarding..."
sudo -H -u ubuntu ANTHROPIC_API_KEY="${apiKey}" GATEWAY_PORT="${gatewayPort}" bash -c '
export HOME=/home/ubuntu
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

openclaw onboard --non-interactive --accept-risk \
    --mode local \
    --auth-choice apiKey \
    --anthropic-api-key "$ANTHROPIC_API_KEY" \
    --gateway-port $GATEWAY_PORT \
    --gateway-bind loopback \
    --skip-daemon \
    --skip-skills || echo "WARNING: OpenClaw onboarding failed. Run openclaw onboard manually."
'

# Install daemon service with XDG_RUNTIME_DIR set
echo "Installing OpenClaw daemon..."
sudo -H -u ubuntu XDG_RUNTIME_DIR=/run/user/1000 bash -c '
export HOME=/home/ubuntu
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

openclaw daemon install || echo "WARNING: Daemon install failed. Run openclaw daemon install manually."
'

# Configure gateway for Tailscale Serve (trustedProxies + skip device pairing + set token)
echo "Configuring gateway for Tailscale Serve..."
sudo -H -u ubuntu GATEWAY_TOKEN="${gwToken}" python3 << 'PYTHON_SCRIPT'
import json
import os
config_path = "/home/ubuntu/.openclaw/openclaw.json"
with open(config_path) as f:
    config = json.load(f)
config["gateway"]["trustedProxies"] = ["127.0.0.1"]
config["gateway"]["controlUi"] = {
    "enabled": True,
    "allowInsecureAuth": True
}
config["gateway"]["auth"] = {
    "mode": "token",
    "token": os.environ["GATEWAY_TOKEN"]
}
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
print("Configured gateway with trustedProxies, controlUi, and token")
PYTHON_SCRIPT

# Enable Tailscale HTTPS proxy (requires HTTPS to be enabled in Tailscale admin console)
echo "Enabling Tailscale HTTPS proxy..."
tailscale serve --bg ${gatewayPort} || echo "WARNING: tailscale serve failed. Enable HTTPS in your Tailscale admin console first."

echo "OpenClaw setup complete!"
`;
});

// --- Virtual Machine ---

const vm = new compute.VirtualMachine("openclaw-vm", {
    resourceGroupName: resourceGroup.name,
    location: location,
    networkProfile: {
        networkInterfaces: [{
            id: nic.id,
            primary: true,
        }],
    },
    hardwareProfile: {
        vmSize: vmSize,
    },
    osProfile: {
        computerName: "openclaw",
        adminUsername: "ubuntu",
        // Azure requires base64 encoding for customData
        customData: userData.apply(script => Buffer.from(script).toString("base64")),
        linuxConfiguration: {
            disablePasswordAuthentication: true,
            ssh: {
                publicKeys: [{
                    path: "/home/ubuntu/.ssh/authorized_keys",
                    keyData: sshKey.publicKeyOpenssh,
                }],
            },
        },
    },
    storageProfile: {
        osDisk: {
            name: "openclaw-osdisk",
            createOption: compute.DiskCreateOptionTypes.FromImage,
            managedDisk: {
                storageAccountType: compute.StorageAccountTypes.Premium_LRS,
            },
            diskSizeGB: 80,
            caching: compute.CachingTypes.ReadWrite,
        },
        imageReference: {
            publisher: "Canonical",
            offer: "ubuntu-24_04-lts",
            sku: "server",
            version: "latest",
        },
    },
});

// --- Outputs ---

export const resourceGroupName = resourceGroup.name;
export const vmName = vm.name;

// Dynamic public IPs are not allocated until the VM is running, so we
// look up the address after the VM resource is created.
export const publicIpAddress = vm.id.apply(_ =>
    network.getPublicIPAddressOutput({
        resourceGroupName: resourceGroup.name,
        publicIpAddressName: publicIp.name,
    }).ipAddress
);

export const privateKey = sshKey.privateKeyOpenssh;
export const gatewayTokenOutput = gatewayToken;

// Azure VMs use their computer name as the Tailscale MagicDNS hostname
const tailscaleHostname = vm.osProfile.apply(p => p?.computerName || "openclaw");

export const tailscaleUrlWithToken = pulumi.interpolate`https://${tailscaleHostname}.${tailnetDnsName}/?token=${gatewayToken}`;
export const sshCommand = pulumi.interpolate`ssh -i <private-key-file> ubuntu@${publicIpAddress}`;
