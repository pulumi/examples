"""release-pvcs.sh against a fake kubectl."""

import json
import os
import stat
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "release-pvcs.sh"

FAKE_KUBECTL = r'''#!/usr/bin/env bash
S="$FAKE_STATE"
echo "$*" >> "$S/calls"
case "$*" in
  *"get pvc -A --request-timeout"*) [ -e "$S/unreachable" ] && exit 1; exit 0 ;;
  *"get pvc -A -o jsonpath"*) cat "$S/pvcs" 2>/dev/null; exit 0 ;;
  *"delete pvc --all -A"*) : > "$S/pvcs"; echo 0 > "$S/pvs"; exit 0 ;;
  *"get pv --no-headers"*) n=$(cat "$S/pvs" 2>/dev/null || echo 0); for ((i=0;i<n;i++)); do echo "pv-$i"; done; exit 0 ;;
esac
echo "unexpected: $*" >&2; exit 2
'''


@pytest.fixture
def world(tmp_path):
    bin_dir = tmp_path / "bin"; bin_dir.mkdir()
    k = bin_dir / "kubectl"; k.write_text(FAKE_KUBECTL); k.chmod(k.stat().st_mode | stat.S_IEXEC)
    state = tmp_path / "state"; state.mkdir()
    return bin_dir, state


def run(world, timeout=2):
    bin_dir, state = world
    env = {**os.environ, "PATH": f"{bin_dir}:{os.environ['PATH']}", "FAKE_STATE": str(state),
           "KUBECONFIG_JSON": json.dumps({"kind": "Config"}), "PVC_TIMEOUT_SECONDS": str(timeout)}
    return subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True, timeout=60)


def test_deletes_all_pvcs_and_waits_for_volumes(world):
    _, state = world
    (state / "pvcs").write_text("monitoring/prometheus-db\n")
    (state / "pvs").write_text("1")
    r = run(world)
    assert r.returncode == 0, r.stderr
    assert "monitoring/prometheus-db" in r.stdout
    assert "all volumes released" in r.stdout
    assert any("delete pvc --all -A" in c for c in (state / "calls").read_text().splitlines())


def test_nothing_to_do_without_pvcs(world):
    r = run(world)
    assert r.returncode == 0 and "no PersistentVolumeClaims" in r.stdout


def test_unreachable_cluster_does_not_block_destroy(world):
    _, state = world
    (state / "unreachable").touch()
    r = run(world)
    assert r.returncode == 0 and "not reachable" in r.stdout


def test_never_fails_the_destroy_on_timeout(world):
    """A volume that will not release is reported, but the teardown continues."""
    bin_dir, state = world
    (state / "pvcs").write_text("a/b\n")
    k = bin_dir / "kubectl"
    k.write_text(k.read_text().replace('echo 0 > "$S/pvs"', 'echo 1 > "$S/pvs"'))
    r = run(world, timeout=1)
    assert r.returncode == 0
    assert "still present" in r.stderr and "leakcheck" in r.stderr
