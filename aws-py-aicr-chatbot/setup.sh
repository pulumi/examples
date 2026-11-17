#!/usr/bin/env bash
# One-time local setup: Python venv, the AICR SDK from the sibling checkout, and
# the locally built provider plugin. Needed until provider 0.4.0 is published;
# after that, requirements.txt can pin the PyPI package and this script only
# needs to create the venv.
set -euo pipefail
cd "$(dirname "$0")"

PROVIDER_REPO=${PROVIDER_REPO:-../pulumi-nvidia-aicr}
PLUGIN_BIN="$PROVIDER_REPO/bin/pulumi-resource-nvidia-aicr"

if [ ! -d "$PROVIDER_REPO/sdk/python" ]; then
    echo "setup: provider checkout not found at $PROVIDER_REPO (set PROVIDER_REPO)" >&2
    exit 1
fi

if [ ! -x "$PLUGIN_BIN" ]; then
    echo "setup: building the provider binary (make provider in $PROVIDER_REPO)"
    (cd "$PROVIDER_REPO" && make provider)
fi

echo "setup: python venv"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install --quiet --upgrade pip
./venv/bin/pip install --quiet -r requirements-dev.txt

# The SDK's pulumi-plugin.json asks for plugin version 0.0.1-dev; install the
# freshly built binary under that version (reinstall replaces a stale copy).
echo "setup: provider plugin nvidia-aicr 0.0.1-dev from $PLUGIN_BIN"
pulumi plugin install resource nvidia-aicr 0.0.1-dev --file "$PLUGIN_BIN" --reinstall

echo "setup: done. Next:  . ./creds.sh && ./preflight.sh && pulumi stack select dev"
