#!/usr/bin/env bash
# The demo money shots, in escalating order. Run after `pulumi up`:
#   ./verify.sh
# Each step is independent; a failing step prints why and the script carries on.
set -uo pipefail
cd "$(dirname "$0")"

NS_DYNAMO=dynamo-system
DGD=chat-llm
LOCAL_PORT=${LOCAL_PORT:-8000}

step() { echo; echo "=== $*"; }

kc=$(mktemp); trap 'rm -f "$kc"; [ -n "${PF_PID:-}" ] && kill "$PF_PID" 2>/dev/null' EXIT
pulumi stack output kubeconfig --show-secrets > "$kc" || { echo "no kubeconfig output; is the stack up?"; exit 1; }
export KUBECONFIG=$kc
MODEL=$(pulumi stack output model)
CHAT_URL=$(pulumi stack output chat_url)

step "1. GPU nodes (expect $(pulumi config get nodeCount) x nvidia.com/gpu: 1)"
kubectl get nodes -o custom-columns='NODE:.metadata.name,TYPE:.metadata.labels.node\.kubernetes\.io/instance-type,GPU:.status.allocatable.nvidia\.com/gpu,READY:.status.conditions[?(@.type=="Ready")].status'

step "2. The AICR stack as Helm releases (recipe: $(pulumi stack output recipe_name) @ $(pulumi stack output recipe_version))"
helm ls -A --output json | python3 -c '
import json, sys
for r in sorted(json.load(sys.stdin), key=lambda r: (r["namespace"], r["name"])):
    print("  {:<24} {:<36} {:<40} {}".format(r["namespace"], r["name"], r["chart"], r["status"]))'

step "3. Dynamo workload: pods and where they landed"
kubectl get pods -n "$NS_DYNAMO" -l "nvidia.com/dynamo-graph-deployment-name=$DGD" \
    -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase,READY:.status.conditions[?(@.type=="Ready")].status' 2>/dev/null \
  || kubectl get pods -n "$NS_DYNAMO" -o wide | grep -E "NAME|$DGD"

step "4. nvidia-smi inside a decode worker (the GPU, the driver, the model in memory)"
worker=$(kubectl get pods -n "$NS_DYNAMO" -o name | grep -i "$DGD" | grep -i worker | head -1)
if [ -n "$worker" ]; then
    kubectl exec -n "$NS_DYNAMO" "$worker" -- nvidia-smi --query-gpu=name,driver_version,memory.used,memory.total,utilization.gpu --format=csv
else
    echo "  no worker pod found yet"
fi

step "5. The OpenAI-compatible API, straight from the Dynamo frontend (port-forward)"
kubectl port-forward -n "$NS_DYNAMO" "svc/${DGD}-frontend" "$LOCAL_PORT:8000" >/dev/null 2>&1 &
PF_PID=$!
sleep 2
curl -sS --max-time 90 "http://127.0.0.1:$LOCAL_PORT/v1/chat/completions" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"In one sentence, what is a GPU?\"}],\"max_tokens\":60}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin); print("  model:", r.get("model")); print("  answer:", r["choices"][0]["message"]["content"].strip())' \
  || echo "  request failed (model still loading? check step 3)"

step "6. The public chat page"
curl -sS --max-time 10 "${CHAT_URL}api/info" && echo
echo
echo "  open:  $CHAT_URL"
