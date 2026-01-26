import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as tls from "@pulumi/tls";

const config = new pulumi.Config();

const instanceType = config.get("instanceType") ?? "t3.medium";
const anthropicApiKey = config.requireSecret("anthropicApiKey");
const model = config.get("model") ?? "anthropic/claude-sonnet-4";
const enableSandbox = config.getBoolean("enableSandbox") ?? true;
const gatewayPort = config.getNumber("gatewayPort") ?? 18789;
const browserPort = config.getNumber("browserPort") ?? 18791;

const tailscaleAuthKey = config.requireSecret("tailscaleAuthKey");
const tailnetDnsName = config.require("tailnetDnsName");

// Generate a random token for gateway authentication
const gatewayToken = new tls.PrivateKey("clawdbot-gateway-token", {
    algorithm: "ED25519",
}).publicKeyOpenssh.apply(key => {
    // Create a deterministic token from the public key (take first 48 hex chars)
    const hash = require("crypto").createHash("sha256").update(key).digest("hex");
    return hash.substring(0, 48);
});

const sshKey = new tls.PrivateKey("clawdbot-ssh-key", {
    algorithm: "ED25519",
});

const vpc = new aws.ec2.Vpc("clawdbot-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: "clawdbot-vpc" },
});

const gateway = new aws.ec2.InternetGateway("clawdbot-igw", {
    vpcId: vpc.id,
    tags: { Name: "clawdbot-igw" },
});

const subnet = new aws.ec2.Subnet("clawdbot-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    mapPublicIpOnLaunch: true,
    tags: { Name: "clawdbot-subnet" },
});

const routeTable = new aws.ec2.RouteTable("clawdbot-rt", {
    vpcId: vpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: gateway.id,
        },
    ],
    tags: { Name: "clawdbot-rt" },
});

new aws.ec2.RouteTableAssociation("clawdbot-rta", {
    subnetId: subnet.id,
    routeTableId: routeTable.id,
});

const securityGroup = new aws.ec2.SecurityGroup("clawdbot-sg", {
    vpcId: vpc.id,
    description: "Security group for Clawdbot instance",
    ingress: [
        {
            description: "SSH access (fallback)",
            fromPort: 22,
            toPort: 22,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    egress: [
        {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    tags: { Name: "clawdbot-sg" },
});

const keyPair = new aws.ec2.KeyPair("clawdbot-keypair", {
    publicKey: sshKey.publicKeyOpenssh,
});

const ami = aws.ec2.getAmiOutput({
    owners: ["099720109477"],
    mostRecent: true,
    filters: [
        { name: "name", values: ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
});

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

# Install Clawdbot
npm install -g clawdbot@latest

# Add NVM to bashrc if not already there
if ! grep -q 'NVM_DIR' ~/.bashrc; then
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc
fi
UBUNTU_SCRIPT

# Set environment variables for ubuntu user
echo 'export ANTHROPIC_API_KEY="${apiKey}"' >> /home/ubuntu/.bashrc

# Install and configure Tailscale
echo "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey="${tsAuthKey}" --ssh || echo "WARNING: Tailscale setup failed. Run 'sudo tailscale up' manually."

# Enable systemd linger for ubuntu user (required for user services to run at boot)
loginctl enable-linger ubuntu

# Start user's systemd instance (required for user services during cloud-init)
systemctl start user@1000.service

# Run Clawdbot onboarding as ubuntu user (skip daemon install, do it separately)
echo "Running Clawdbot onboarding..."
sudo -H -u ubuntu ANTHROPIC_API_KEY="${apiKey}" GATEWAY_PORT="${gatewayPort}" bash -c '
export HOME=/home/ubuntu
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

clawdbot onboard --non-interactive --accept-risk \
    --mode local \
    --auth-choice apiKey \
    --gateway-port $GATEWAY_PORT \
    --gateway-bind loopback \
    --skip-daemon \
    --skip-skills || echo "WARNING: Clawdbot onboarding failed. Run clawdbot onboard manually."
'

# Install daemon service with XDG_RUNTIME_DIR set
echo "Installing Clawdbot daemon..."
sudo -H -u ubuntu XDG_RUNTIME_DIR=/run/user/1000 bash -c '
export HOME=/home/ubuntu
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

clawdbot daemon install || echo "WARNING: Daemon install failed. Run clawdbot daemon install manually."
'

# Configure gateway for Tailscale Serve (trustedProxies + skip device pairing + set token)
echo "Configuring gateway for Tailscale Serve..."
sudo -H -u ubuntu GATEWAY_TOKEN="${gwToken}" python3 << 'PYTHON_SCRIPT'
import json
import os
config_path = "/home/ubuntu/.clawdbot/clawdbot.json"
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

echo "Clawdbot setup complete!"
`;
});

const instance = new aws.ec2.Instance("clawdbot-instance", {
    ami: ami.id,
    instanceType: instanceType,
    subnetId: subnet.id,
    vpcSecurityGroupIds: [securityGroup.id],
    keyName: keyPair.keyName,
    userData: userData,
    userDataReplaceOnChange: true,
    rootBlockDevice: {
        volumeSize: 30,
        volumeType: "gp3",
    },
    tags: { Name: "clawdbot" },
});

export const publicIp = instance.publicIp;
export const publicDns = instance.publicDns;
export const privateKey = sshKey.privateKeyOpenssh;

// Construct the Tailscale MagicDNS hostname from the private IP
// AWS private IPs like 10.0.1.15 become hostnames like ip-10-0-1-15
const tailscaleHostname = instance.privateIp.apply(ip => `ip-${ip.replace(/\./g, "-")}`);

export const tailscaleUrl = pulumi.interpolate`https://${tailscaleHostname}.${tailnetDnsName}/`;
export const tailscaleUrlWithToken = pulumi.interpolate`https://${tailscaleHostname}.${tailnetDnsName}/?token=${gatewayToken}`;
export const gatewayTokenOutput = gatewayToken;
