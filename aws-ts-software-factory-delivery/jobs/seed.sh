#!/usr/bin/env sh
# Seed the Factory board with the demo work items. Idempotent (skips existing
# titles), and order matters: the duplicate must follow its original.
set -eu
. ./jobs/_kubeconfig.sh
kube_setup
cd ..

scripts/seed-issues.sh "${FACTORY_PROJECT:-agent-factory-demo}" < examples/items.txt

printf '{"seeded":"%s"}\n' "${FACTORY_PROJECT:-agent-factory-demo}" > "$DELIVERY_OUTPUTS"
