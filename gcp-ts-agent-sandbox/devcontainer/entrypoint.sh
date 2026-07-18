#!/bin/bash
# Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
#
# envbuilder runs this once the devcontainer image is built. It has already
# dropped root and exec'd us as `containerUser` (vscode), which is why
# `containerUser` is set in devcontainer.json: Claude Code refuses
# --dangerously-skip-permissions as root, so running unprivileged here is
# load-bearing.
set -x

WORKSPACE="${ENVBUILDER_WORKSPACE_FOLDER:-/workspaces/demo}"

# --- 1. credentials -----------------------------------------------------------
# The Secret is mounted read-only at /tokens/claude. Claude Code rewrites this
# file whenever it refreshes the OAuth access token (access ~12h, refresh ~10d),
# so it cannot live on a read-only mount: copy it into $HOME and let the CLI own
# it. .claude.json carries the onboarding flag and account stub; without it the
# interactive TUI tries to open a browser to log in, even with valid creds.
mkdir -p "$HOME/.claude"
install -m 600 /tokens/claude/credentials.json "$HOME/.claude/.credentials.json"
install -m 600 /tokens/claude/claude.json "$HOME/.claude.json"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE" || exit 1

# --- 2. the boot task, in the background --------------------------------------
# Run the agent in the background so the IDE comes up immediately rather than
# waiting for the agent to finish thinking. The marker file guards re-runs: a
# Sandbox can be suspended and resumed, and resume re-runs this script, so write
# the marker before forking to keep a fast resume from racing a second agent into
# the same workspace.
if [ -f "$WORKSPACE/agent-prompt.txt" ]; then
    echo "agent-prompt.txt exists, skipping agent run"
elif [ -n "$AGENT_PROMPT" ]; then
    echo "$AGENT_PROMPT" > "$WORKSPACE/agent-prompt.txt"
    (
        claude -p "$AGENT_PROMPT" --dangerously-skip-permissions \
            > "$WORKSPACE/agent-output.txt" 2>&1 || true
    ) &
fi

# --- 3. the IDE ---------------------------------------------------------------
# --auth=none is safe here: nothing can reach this port without being on the
# tailnet, and the tailnet ACL grants exactly one person exactly this box. The
# rule that decides who holds that key lives in the Pulumi program, not next to
# this script.
exec /usr/bin/code-server --auth=none --bind-addr=0.0.0.0:13337 "$WORKSPACE"
