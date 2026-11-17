#!/usr/bin/env bash
# Runs on `pulumi destroy`, before the AICR stack is uninstalled: delete every
# PersistentVolumeClaim in the cluster and wait for the backing volumes to go.
#
# Helm uninstall leaves StatefulSet PVCs behind by design (the recipe's
# Prometheus keeps a 50 GB one), and once the cluster is gone nothing can
# release the EBS volume. Running while the EBS CSI driver is still installed
# lets the normal Delete reclaim path remove the volume.
#
# Inputs (environment): KUBECONFIG_JSON (required), PVC_TIMEOUT_SECONDS (default 180).
set -uo pipefail

: "${KUBECONFIG_JSON:?KUBECONFIG_JSON must hold the cluster kubeconfig}"
TIMEOUT=${PVC_TIMEOUT_SECONDS:-180}

kc=$(mktemp)
trap 'rm -f "$kc"' EXIT
printf '%s' "$KUBECONFIG_JSON" > "$kc"
export KUBECONFIG="$kc"

# The cluster may already be unreachable (e.g. a partial destroy); that is not
# an error worth blocking the teardown on.
if ! kubectl get pvc -A --request-timeout=20s >/dev/null 2>&1; then
    echo "release-pvcs: cluster not reachable, nothing to do"
    exit 0
fi

pvcs=$(kubectl get pvc -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}')
if [ -z "$pvcs" ]; then
    echo "release-pvcs: no PersistentVolumeClaims"
    exit 0
fi
echo "release-pvcs: deleting:"; echo "$pvcs" | sed 's/^/  /'

kubectl delete pvc --all -A --wait=false >/dev/null 2>&1 || true
# Pods holding a PVC keep it Terminating; the Helm uninstall that follows
# removes them, but give the common case (no holders) a chance to finish here.
deadline=$((SECONDS + TIMEOUT))
while (( SECONDS < deadline )); do
    remaining=$(kubectl get pv --no-headers 2>/dev/null | wc -l | tr -d ' ')
    [ "$remaining" = 0 ] && { echo "release-pvcs: all volumes released"; exit 0; }
    sleep 5
done
echo "release-pvcs: $remaining PersistentVolume(s) still present after ${TIMEOUT}s; leakcheck.sh will show any orphaned EBS volume" >&2
exit 0
