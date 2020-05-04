#!/bin/bash
set -o errexit -o pipefail

echo Deleting ephemeral Kubernetes cluster...

pushd misc/scripts/testinfra/
yarn
pulumi stack select $1 && \
  pulumi destroy --skip-preview --yes && \
  pulumi stack rm --yes

popd
