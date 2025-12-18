#!/bin/bash
set -e

# Install gcloud CLI (official apt repo)
sudo apt-get update -y
sudo apt-get install -y apt-transport-https ca-certificates gnupg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
  | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
sudo apt-get update -y
sudo apt-get install -y google-cloud-cli


curl -fsSL https://get.pulumi.com | sh
echo 'export PATH=$HOME/.pulumi/bin:$PATH' >> ~/.bashrc
echo 'export PATH=$HOME/.pulumi/bin:$PATH' >> ~/.profile
export PATH=$HOME/.pulumi/bin:$PATH
pulumi version
