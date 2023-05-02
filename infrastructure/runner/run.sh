#!/bin/bash -x

set -euo pipefail

yarn --cwd infrastructure/runner install
yarn --cwd infrastructure/runner start -- "$1"
