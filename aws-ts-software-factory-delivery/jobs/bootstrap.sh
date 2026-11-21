#!/usr/bin/env sh
# Point Factory at the in-cluster model. Idempotent; runs on every release.
set -eu
. ./jobs/_kubeconfig.sh
kube_setup
cd ..                       # delivery/ -> repo root, where scripts/ lives

npm ci --silent
npx tsx scripts/bootstrap.ts --project "${FACTORY_PROJECT:-agent-factory-demo}"

printf '{"project":"%s","factoryUrl":"%s"}\n' \
    "${FACTORY_PROJECT:-agent-factory-demo}" "${FACTORY_URL:-}" > "$DELIVERY_OUTPUTS"
