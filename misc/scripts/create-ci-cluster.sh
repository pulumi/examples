#!/bin/bash
set -o errexit -o pipefail

echo Creating ephemeral Kubernetes cluster for CI testing...

pushd misc/scripts/testinfra/
yarn
pulumi stack init --non-interactive ${1}
pulumi up --skip-preview --yes

popd
