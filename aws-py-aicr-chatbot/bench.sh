#!/usr/bin/env bash
# Put load on both GPUs: N concurrent chat completions against the Dynamo
# frontend (port-forwarded), so `nvidia-smi` on both nodes shows utilization
# and the tokens/s of the pair is visible.
#   . ./creds.sh && ./bench.sh [concurrency=8] [requests_per_worker=3]
set -uo pipefail
cd "$(dirname "$0")"

CONCURRENCY=${1:-8}
ROUNDS=${2:-3}
LOCAL_PORT=${LOCAL_PORT:-8001}
NS_DYNAMO=dynamo-system
DGD=chat-llm

kc=$(mktemp); trap 'rm -f "$kc"; [ -n "${PF_PID:-}" ] && kill "$PF_PID" 2>/dev/null' EXIT
pulumi stack output kubeconfig --show-secrets > "$kc" || exit 1
export KUBECONFIG=$kc
MODEL=$(pulumi stack output model)

kubectl port-forward -n "$NS_DYNAMO" "svc/${DGD}-frontend" "$LOCAL_PORT:8000" >/dev/null 2>&1 &
PF_PID=$!
sleep 2

prompts=(
  "Explain how a transformer attention layer works."
  "Write a short poem about GPUs in a data center."
  "What are the trade-offs between Kubernetes DaemonSets and Deployments?"
  "Summarize the history of CUDA in five sentences."
  "Give me a recipe for a quick weekday pasta."
  "Why is the sky blue? Answer for a ten-year-old."
  "List ten uses of infrastructure as code."
  "Describe KV-cache-aware routing in an inference server."
)

one() {
    local i=$1
    local p="${prompts[$((i % ${#prompts[@]}))]}"
    curl -sS --max-time 120 "http://127.0.0.1:$LOCAL_PORT/v1/chat/completions" \
        -H 'Content-Type: application/json' \
        -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"$p\"}],\"max_tokens\":256}" \
      | python3 -c 'import json,sys; r=json.load(sys.stdin); print(r["usage"]["completion_tokens"])' 2>/dev/null || echo 0
}

echo "bench: $CONCURRENCY concurrent clients x $ROUNDS requests, max_tokens=256, model=$MODEL"
results=$(mktemp -d)
workers=$(kubectl get pods -n "$NS_DYNAMO" -o name | grep -i "$DGD" | grep -i worker)

# Sample GPU utilization on every worker while the load runs (peak is reported).
sample_gpus() {
    while true; do
        for pod in $workers; do
            printf '%s %s\n' "$pod" "$(kubectl exec -n "$NS_DYNAMO" "$pod" -- nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | tr -d ' ')"
        done
        sleep 1
    done
}
sample_gpus > "$results/gpu-samples" 2>/dev/null &
SAMPLER_PID=$!

start=$(date +%s)
for ((r = 0; r < ROUNDS; r++)); do
    pids=()
    for ((c = 0; c < CONCURRENCY; c++)); do
        one $((r * CONCURRENCY + c)) > "$results/$r-$c" &
        pids+=($!)
    done
    wait "${pids[@]}"       # only the requests -- a bare `wait` would also block on the port-forward
done
elapsed=$(( $(date +%s) - start ))
kill "$SAMPLER_PID" 2>/dev/null; wait "$SAMPLER_PID" 2>/dev/null
total=$(cat "$results"/[0-9]* | paste -sd+ - | bc)
[ "$elapsed" -gt 0 ] || elapsed=1
echo "bench: $total completion tokens in ${elapsed}s  =>  $(echo "scale=1; $total / $elapsed" | bc) tok/s aggregate"
echo
echo "Peak GPU utilization during the run, per worker (both should be busy):"
for pod in $workers; do
    peak=$(awk -v p="$pod" '$1 == p && $2 != "" { if ($2 + 0 > m) m = $2 + 0 } END { print m + 0 }' "$results/gpu-samples")
    printf '  %-60s %s%%\n' "$pod" "$peak"
done
rm -rf "$results"
