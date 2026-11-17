#!/usr/bin/env sh
# 22 cross-stack contract checks plus in-cluster reachability from the agent pod.
# Stack outputs arrive on the environment because the job's PULUMI_ACCESS_TOKEN
# only covers the pipeline stack, not the five target stacks.
set -eu
. ./jobs/_kubeconfig.sh
kube_setup
cd ..

npm ci --silent
npx tsx scripts/compat-check.ts --owner "$OWNER" --from-env

printf '{"checked":"%s","release":"%s"}\n' \
    "$DELIVERY_STAGE" "$DELIVERY_RELEASE" > "$DELIVERY_OUTPUTS"
