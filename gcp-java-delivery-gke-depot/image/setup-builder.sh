#!/usr/bin/env bash
# Registers the Depot buildx builder on this machine's Docker daemon and
# prints its name (depot_<project id>) on stdout. Everything else goes to
# stderr, so the program can read the name from stdout.
#
# Needs DEPOT_TOKEN (a Depot project token) and DEPOT_PROJECT_ID.
# Uses `depot` from PATH if present, otherwise installs a pinned, checksum
# verified release into .depot/bin (or $DEPOT_INSTALL_DIR).
set -euo pipefail

: "${DEPOT_TOKEN:?DEPOT_TOKEN is not set. Add it to the ESC environment of this stack.}"
: "${DEPOT_PROJECT_ID:?DEPOT_PROJECT_ID is not set.}"

DEPOT_VERSION="2.103.4"
declare -A DEPOT_SHA256=(
  [amd64]="564b9f8b5bbf933adeccd9d5347c395b5f5c82951fbd7ad84eb02cee9a0a26a0"
  [arm64]="8d114fed30cb73cd70ba7e05dd43e9009bad1e64acfe1e610643cba042bd6e34"
)

install_depot() {
  local arch dir tmp
  case "$(uname -m)" in
    x86_64 | amd64) arch=amd64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) echo "unsupported architecture $(uname -m)" >&2; exit 1 ;;
  esac
  dir="${DEPOT_INSTALL_DIR:-$PWD/.depot/bin}"
  if [ -x "$dir/depot" ] && "$dir/depot" --version 2>/dev/null | grep -q "$DEPOT_VERSION"; then
    echo "$dir/depot"
    return
  fi
  tmp="$(mktemp -d)"
  local tarball="depot_${DEPOT_VERSION}_linux_${arch}.tar.gz"
  echo "Installing depot $DEPOT_VERSION ($arch) into $dir" >&2
  curl --fail --silent --show-error --location \
    --output "$tmp/$tarball" \
    "https://github.com/depot/cli/releases/download/v${DEPOT_VERSION}/${tarball}"
  echo "${DEPOT_SHA256[$arch]}  $tmp/$tarball" | sha256sum --check --quiet >&2
  tar -xzf "$tmp/$tarball" -C "$tmp"
  mkdir -p "$dir"
  mv "$tmp/bin/depot" "$dir/depot"
  chmod +x "$dir/depot"
  rm -rf "$tmp"
  echo "$dir/depot"
}

if command -v depot >/dev/null 2>&1; then
  depot_bin="$(command -v depot)"
else
  depot_bin="$(install_depot)"
fi

# Writes the builder into the Docker config directory ($DOCKER_CONFIG or
# ~/.docker) and creates one proxy container per architecture on the local
# daemon. It does not contact Depot, so a bad token only shows up when the
# build starts.
"$depot_bin" configure-docker --project "$DEPOT_PROJECT_ID" >&2

echo "depot_${DEPOT_PROJECT_ID}"
