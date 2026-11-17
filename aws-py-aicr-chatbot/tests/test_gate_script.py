"""wait-for-dynamo.sh against a fake kubectl: it must poll until every
condition holds, and time out with a useful message on the one that doesn't."""

import json
import os
import stat
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "wait-for-dynamo.sh"

# The fake kubectl reads its world state from files in $FAKE_STATE:
#   crd_ok, deploy_ok, endpoints_ok, webhook_ok  (existence = condition met)
#   webhook_mode   "accept" (default) | "deny" | "unauthorized" -- what the dry run prints when webhook_ok
#   gpu_nodes      (number of Ready nodes advertising a GPU)
FAKE_KUBECTL = r'''#!/usr/bin/env bash
S="$FAKE_STATE"
echo "$*" >> "$S/calls"
case "$*" in
  *"crd/dynamographdeployments.nvidia.com"*)
    [ -e "$S/crd_ok" ] && exit 0
    echo 'error: no matching resources found'; exit 1 ;;
  *"deployment -l app.kubernetes.io/name=dynamo-operator"*)
    [ -e "$S/deploy_ok" ] && exit 0
    echo 'error: timed out waiting for the condition'; exit 1 ;;
  *"get endpoints"*)
    [ -e "$S/endpoints_ok" ] && { echo "10.0.1.7"; exit 0; }
    exit 0 ;;
  *"--dry-run=server"*)
    if [ -e "$S/webhook_ok" ]; then
      case "$(cat "$S/webhook_mode" 2>/dev/null || echo accept)" in
        accept) echo 'dynamographdeployment.nvidia.com/gate-probe created (server dry run)'; exit 0 ;;
        deny) echo 'Error from server (Forbidden): error when creating "STDIN": admission webhook "vdynamographdeployment.kb.io" denied the request: spec.components must not be empty'; exit 1 ;;
        unauthorized) echo 'error: You must be logged in to the server (Unauthorized)'; exit 1 ;;
      esac
    fi
    echo 'Error from server (InternalError): Internal error occurred: failed calling webhook "vdynamographdeployment.kb.io": failed to call webhook: Post "https://dynamo-platform-dynamo-operator-webhook.dynamo-system.svc:443/validate": dial tcp 10.0.0.1:443: connect: connection refused'; exit 1 ;;
  *"get nodes -o json"*)
    n=$(cat "$S/gpu_nodes" 2>/dev/null || echo 0)
    python3 - "$n" <<'EOF'
import json, sys
n = int(sys.argv[1])
items = [{"status": {"allocatable": {"nvidia.com/gpu": "1"}, "conditions": [{"type": "Ready", "status": "True"}]}} for _ in range(n)]
items.append({"status": {"allocatable": {}, "conditions": [{"type": "Ready", "status": "True"}]}})       # a CPU-only node
items.append({"status": {"allocatable": {"nvidia.com/gpu": "1"}, "conditions": [{"type": "Ready", "status": "False"}]}})  # GPU but NotReady
print(json.dumps({"items": items}))
EOF
    exit 0 ;;
esac
echo "fake kubectl: unexpected args: $*" >&2; exit 2
'''


@pytest.fixture
def world(tmp_path):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    kubectl = bin_dir / "kubectl"
    kubectl.write_text(FAKE_KUBECTL)
    kubectl.chmod(kubectl.stat().st_mode | stat.S_IEXEC)
    state = tmp_path / "state"
    state.mkdir()
    return bin_dir, state


def run_gate(world, timeout=3, min_gpu_nodes=2):
    bin_dir, state = world
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "FAKE_STATE": str(state),
        "KUBECONFIG_JSON": json.dumps({"kind": "Config"}),
        "GATE_TIMEOUT_SECONDS": str(timeout),
        "GATE_POLL_SECONDS": "0",
        "MIN_GPU_NODES": str(min_gpu_nodes),
    }
    return subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True, timeout=60)


def make_ready(state, gpu_nodes=2):
    for f in ("crd_ok", "deploy_ok", "endpoints_ok", "webhook_ok"):
        (state / f).touch()
    (state / "gpu_nodes").write_text(str(gpu_nodes))


def test_passes_when_everything_is_ready(world):
    _, state = world
    make_ready(state)
    r = run_gate(world)
    assert r.returncode == 0, r.stderr
    assert r.stdout.count("gate: ok") == 5
    assert "Dynamo platform ready" in r.stdout


def test_requires_the_kubeconfig(world):
    bin_dir, state = world
    env = {**os.environ, "PATH": f"{bin_dir}:{os.environ['PATH']}", "FAKE_STATE": str(state)}
    env.pop("KUBECONFIG_JSON", None)
    r = subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True)
    assert r.returncode != 0
    assert "KUBECONFIG_JSON" in r.stderr


def test_times_out_naming_the_webhook_when_it_never_answers(world):
    _, state = world
    make_ready(state)
    (state / "webhook_ok").unlink()
    r = run_gate(world, timeout=1)
    assert r.returncode == 1
    assert "timed out" in r.stderr and "webhook" in r.stderr
    assert "failed calling webhook" in r.stderr, "the last kubectl error is echoed for diagnosis"
    assert r.stdout.count("gate: ok") == 3, "CRD, operator and endpoint checks passed before the webhook wait"


def test_denial_by_the_webhook_counts_as_answering(world):
    """The webhook rejecting the probe on content proves it is up."""
    _, state = world
    make_ready(state)
    (state / "webhook_mode").write_text("deny")
    r = run_gate(world)
    assert r.returncode == 0, r.stderr
    assert "webhook answering" in r.stdout


def test_unrelated_kubectl_failures_do_not_pass_the_webhook_probe(world):
    """Only 'created (server dry run)' or a webhook denial count; e.g. an expired token must not."""
    _, state = world
    make_ready(state)
    (state / "webhook_mode").write_text("unauthorized")
    r = run_gate(world, timeout=1)
    assert r.returncode == 1
    assert "webhook answering" in r.stderr and "Unauthorized" in r.stderr


def test_waits_for_webhook_endpoints_before_probing(world):
    _, state = world
    make_ready(state)
    (state / "endpoints_ok").unlink()
    r = run_gate(world, timeout=1)
    assert r.returncode == 1
    assert "ready endpoints" in r.stderr
    assert "--dry-run=server" not in (state / "calls").read_text(), "no probe until endpoints exist"


def test_counts_only_ready_gpu_nodes(world):
    _, state = world
    make_ready(state, gpu_nodes=1)       # plus one CPU node and one NotReady GPU node from the fake
    r = run_gate(world, timeout=1, min_gpu_nodes=2)
    assert r.returncode == 1
    assert "2 Ready nodes advertising nvidia.com/gpu" in r.stderr
    assert run_gate(world, min_gpu_nodes=1).returncode == 0


def test_polls_until_conditions_appear(world):
    """Conditions that turn true while polling are picked up (the fake flips them on first call)."""
    bin_dir, state = world
    make_ready(state)
    (state / "crd_ok").unlink()
    flipper = bin_dir / "kubectl"
    original = flipper.read_text()
    flipper.write_text(original.replace('*"crd/dynamographdeployments.nvidia.com"*)',
                                        '*"crd/dynamographdeployments.nvidia.com"*)\n    touch "$S/crd_ok.seen"; [ -e "$S/crd_ok.seen.2" ] && touch "$S/crd_ok"; touch "$S/crd_ok.seen.2"'))
    r = run_gate(world, timeout=5)
    assert r.returncode == 0, r.stderr
    calls = (state / "calls").read_text().splitlines()
    assert sum("crd/dynamographdeployments" in c for c in calls) >= 2, "the CRD check was retried"


def test_script_passes_shell_syntax_check():
    assert subprocess.run(["bash", "-n", str(SCRIPT)]).returncode == 0
