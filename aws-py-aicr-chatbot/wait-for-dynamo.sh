#!/usr/bin/env bash
# Readiness gate between the AICR ClusterStack and the model deployment.
#
# The ClusterStack is deployed with skipAwait, so it completes once the Helm
# releases are installed -- before the Dynamo operator's admission webhook is
# serving. Creating a DynamoGraphDeployment at that point fails. This script
# blocks until exactly the things the model layer consumes are ready:
#   1. the DynamoGraphDeployment CRD is established (the operator's init
#      container applies it, so this also means the operator pod has started)
#   2. the Dynamo operator Deployment is Available
#   3. the webhook Service has ready endpoints
#   4. the admission webhook answers end to end (server-side dry-run probe,
#      which exercises the ValidatingWebhookConfiguration, its CA bundle and TLS)
#   5. at least MIN_GPU_NODES nodes advertise nvidia.com/gpu (GPU Operator done)
#
# Inputs (environment): KUBECONFIG_JSON (required), GATE_TIMEOUT_SECONDS
# (default 1200), MIN_GPU_NODES (default 2), DYNAMO_NAMESPACE (default dynamo-system).
set -euo pipefail

: "${KUBECONFIG_JSON:?KUBECONFIG_JSON must hold the cluster kubeconfig}"
TIMEOUT=${GATE_TIMEOUT_SECONDS:-1200}
MIN_GPU_NODES=${MIN_GPU_NODES:-2}
NS=${DYNAMO_NAMESPACE:-dynamo-system}
POLL=${GATE_POLL_SECONDS:-10}

kc=$(mktemp)
trap 'rm -f "$kc"' EXIT
printf '%s' "$KUBECONFIG_JSON" > "$kc"
export KUBECONFIG="$kc"

deadline=$((SECONDS + TIMEOUT))

# wait_for <description> <command...>: poll until the command succeeds.
wait_for() {
    local what=$1; shift
    until "$@" >/dev/null 2>&1; do
        if (( SECONDS >= deadline )); then
            echo "gate: timed out after ${TIMEOUT}s waiting for: $what" >&2
            "$@" 2>&1 | tail -5 >&2 || true
            exit 1
        fi
        sleep "$POLL"
    done
    echo "gate: ok - $what"
}

webhook_has_endpoints() {
    local ips
    ips=$(kubectl get endpoints -n "$NS" \
            -l app.kubernetes.io/component=webhook,app.kubernetes.io/created-by=dynamo-operator \
            -o jsonpath='{.items[*].subsets[*].addresses[*].ip}' 2>&1) || { echo "$ips"; return 1; }
    [ -n "$ips" ] || { echo "webhook Service has no ready endpoints yet"; return 1; }
}

# Server-side dry-run of a minimal but fully valid DynamoGraphDeployment (one
# Frontend). It passes CRD schema validation and the operator's webhook, so the
# expected outcome is an unambiguous "created (server dry run)". A webhook
# denial on content also proves the webhook is serving. Anything else --
# transport errors, auth failures, DNS, or an "is invalid" that could equally
# come from the CRD schema -- means "not yet": an allowlist, so unrelated
# failures cannot pass the gate. (Verified live 2026-09-18: an empty
# components list is rejected by the webhook as "is invalid", which is why the
# probe carries a real component.)
webhook_answers() {
    local out
    out=$(kubectl create --dry-run=server -n "$NS" -f - 2>&1 <<'EOF' || true
apiVersion: nvidia.com/v1beta1
kind: DynamoGraphDeployment
metadata:
  name: gate-probe
spec:
  backendFramework: vllm
  components:
    - name: Frontend
      type: frontend
      replicas: 1
      podTemplate:
        spec:
          containers:
            - name: main
              image: nvcr.io/nvidia/ai-dynamo/vllm-runtime:1.4.2
EOF
)
    if grep -qE 'created \(server dry run\)|admission webhook .* denied the request' <<<"$out"; then
        return 0
    fi
    echo "webhook not serving yet: $out"
    return 1
}

gpu_nodes_ready() {
    local n
    n=$(kubectl get nodes -o json | python3 -c '
import json, sys
nodes = json.load(sys.stdin)["items"]
ready = [n for n in nodes
         if int(n["status"].get("allocatable", {}).get("nvidia.com/gpu", "0")) > 0
         and any(c["type"] == "Ready" and c["status"] == "True" for c in n["status"].get("conditions", []))]
print(len(ready))')
    echo "$n of $MIN_GPU_NODES required GPU nodes are Ready"
    (( n >= MIN_GPU_NODES ))
}

wait_for "CRD dynamographdeployments.nvidia.com established" \
    kubectl wait --for=condition=Established --timeout=5s crd/dynamographdeployments.nvidia.com
wait_for "Dynamo operator Deployment available in $NS" \
    kubectl wait -n "$NS" deployment -l app.kubernetes.io/name=dynamo-operator --for=condition=Available --timeout=5s
wait_for "Dynamo webhook Service has ready endpoints" webhook_has_endpoints
wait_for "Dynamo admission webhook answering" webhook_answers
wait_for "$MIN_GPU_NODES Ready nodes advertising nvidia.com/gpu" gpu_nodes_ready

echo "gate: Dynamo platform ready for workloads"
