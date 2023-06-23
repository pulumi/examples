#!/bin/bash -x

set -euo pipefail

export EXAMPLES_API_KEY="$(pulumi --cwd infrastructure/api --stack $EXAMPLES_API_STACK stack output apiKey --show-secrets)"

yarn --cwd infrastructure/runner install
yarn --cwd infrastructure/runner start -- "$1"
