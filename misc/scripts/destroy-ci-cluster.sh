#!/bin/bash
set -o errexit -o pipefail

echo Deleting ephemeral Kubernetes cluster...

pushd misc/scripts/testinfra/
    pulumi install
    pulumi stack select "$1"
    pulumi destroy --skip-preview --remove
popd
