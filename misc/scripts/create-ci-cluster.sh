#!/bin/bash
set -o errexit -o pipefail

echo Creating ephemeral Kubernetes cluster for CI testing...

pushd misc/scripts/testinfra/
    pulumi install
    pulumi stack init "$1"
    pulumi up --skip-preview
popd
