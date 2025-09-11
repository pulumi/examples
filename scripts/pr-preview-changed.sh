#!/usr/bin/env bash
set -euo pipefail

# PR-mode preview tester for changed Pulumi examples.
# - Detects changed files vs a base ref (default: origin/master or origin/main)
# - Resolves to example roots (nearest ancestor with Pulumi.yaml)
# - Installs per-language deps and runs `pulumi preview` on a temporary file backend
# - Automatically seeds missing config with safe preview placeholders

BASE_REF_INPUT=${BASE_REF:-}
# Prefer master-first (this repo uses master), then main fallbacks
DEFAULT_BASE_CANDIDATES=(origin/master origin/main master main)

timestamp() { date -u +%Y%m%d%H%M%S; }

repo_root=$(git rev-parse --show-toplevel)
# This is the pulumi/examples repository - repo root IS the examples root
examples_root="$repo_root"

run_id=${RUN_ID:-$(timestamp)}
# Create temporary backend and isolated environment in system temp directories
backend_dir=$(mktemp -d -t "pulumi-pr-backend-$run_id-XXXXXX")
export PULUMI_BACKEND_URL="file://$backend_dir"
# Set deterministic passphrase for temporary backend (caller can override)
export PULUMI_CONFIG_PASSPHRASE=${PULUMI_CONFIG_PASSPHRASE:-preview-passphrase-123}

# Honor existing AWS env; allow caller to override AWS_PROFILE/AWS_REGION
: "${AWS_REGION:=us-west-2}"

# Create isolated Go caches in system temp dir to avoid global cache conflicts
gomodcache_dir=$(mktemp -d -t "gomodcache-$run_id-XXXXXX")
gocache_dir=$(mktemp -d -t "gocache-$run_id-XXXXXX")
export GOMODCACHE="$gomodcache_dir"
export GOCACHE="$gocache_dir"

echo "Pulumi backend: $PULUMI_BACKEND_URL"
echo "AWS_REGION:     $AWS_REGION"
cleanup() {
  chmod -R u+w "$gomodcache_dir" "$gocache_dir" 2>/dev/null || true
  rm -rf "$backend_dir" "$gomodcache_dir" "$gocache_dir" 2>/dev/null || true
}
trap cleanup EXIT

# Determine base ref
base_ref=""
if [ -n "$BASE_REF_INPUT" ]; then
  base_ref="$BASE_REF_INPUT"
else
  for cand in "${DEFAULT_BASE_CANDIDATES[@]}"; do
    if git rev-parse --verify -q "$cand" >/dev/null; then base_ref="$cand"; break; fi
  done
  if [ -z "$base_ref" ]; then
    # Fallback to merge-base with HEAD~ if remote not available
    base_ref=$(git rev-parse HEAD~1 2>/dev/null || echo "HEAD")
  fi
fi

merge_base=$(git merge-base "$base_ref" HEAD 2>/dev/null || echo "")
if [ -n "$merge_base" ]; then
  changed_paths=$(git diff --name-only "$merge_base" HEAD || true)
else
  changed_paths=$(git diff --name-only "$base_ref" HEAD 2>/dev/null || true)
fi
# If no committed diffs, fall back to working tree changes (staged/unstaged/untracked)
if [ -z "${changed_paths:-}" ]; then
  echo "(Using working tree changes)"
  staged=$(git diff --name-only --cached || true)
  unstaged=$(git diff --name-only || true)
  untracked=$(git ls-files --others --exclude-standard || true)
  changed_paths=$(printf "%s\n%s\n%s\n" "$staged" "$unstaged" "$untracked" | sed '/^$/d')
fi

changed_array=()
while IFS= read -r _p; do
  [ -n "$_p" ] && changed_array+=("$_p")
done <<< "$changed_paths"

# Collect candidate projects by finding Pulumi.yaml in changed file paths
projects=()
for p in "${changed_array[@]}"; do
  # Start from the changed file's directory
  dir="$repo_root/$(dirname "$p")"
  # Walk up directory tree to find nearest Pulumi.yaml
  while [ "$dir" != "$repo_root" ] && [ ! -f "$dir/Pulumi.yaml" ]; do
    dir=$(dirname "$dir")
  done
  if [ -f "$dir/Pulumi.yaml" ]; then
    # Convert to relative path from examples root
    rel=${dir#"$examples_root/"}
    projects+=("$rel")
  fi
done

# Dedupe and sort
projects_sorted=$(printf '%s\n' "${projects[@]:-}" | sed '/^$/d' | sort -u)

# If nothing detected, exit gracefully
if [ -z "$projects_sorted" ]; then
  echo "No changed examples detected vs $base_ref"
  exit 0
fi

sanitize() { echo "$1" | sed 's#[/ ]#__#g'; }

detect_runtime() {
  local dir="$1"
  if [ -f "$dir/Pulumi.yaml" ]; then
    local rt
    rt=$(sed -n 's/^runtime:\s*//p' "$dir/Pulumi.yaml" | head -n1)
    case "$rt" in
      nodejs|python|go|dotnet|yaml) echo "$rt"; return;;
    esac
  fi
  [ -f "$dir/package.json" ] && { echo nodejs; return; }
  [ -f "$dir/requirements.txt" ] && { echo python; return; }
  [ -f "$dir/go.mod" ] && { echo go; return; }
  ls "$dir"/*.csproj >/dev/null 2>&1 && { echo dotnet; return; }
  [ -f "$dir/Pulumi.yaml" ] && { echo yaml; return; }
  echo unknown
}

install_deps() {
  local dir="$1" rt="$2"
  case "$rt" in
    nodejs)
      if [ -f "$dir/package-lock.json" ]; then npm ci --silent; else npm install --silent; fi ;;
    python)
      if [ -f "$dir/requirements.txt" ]; then python3 -m venv venv && . venv/bin/activate && pip install -q -r requirements.txt; fi ;;
    go)
      go mod download || true ;;
    dotnet|yaml|unknown)
      : ;;
  esac
}

seed_config() {
  local project_name="$1"
  
  # Set basic AWS region
  pulumi config set aws:region "$AWS_REGION" || true
  
  # Generate short name for placeholders
  local short_name=$(echo "$project_name" | sed 's/[^a-zA-Z0-9]//g' | head -c 8)
  
  # Run preview to detect missing required configs
  local preview_output
  if preview_output=$(pulumi preview --non-interactive 2>&1); then
    return 0  # Preview succeeded, no config seeding needed
  fi
  
  # Parse and seed missing configuration variables with safe preview placeholders
  if echo "$preview_output" | grep -q "Missing required configuration variable"; then
    local missing_vars
    missing_vars=$(echo "$preview_output" | grep "Missing required configuration variable" | sed "s/.*'\([^']*\)'.*/\1/" || true)
    
    while IFS= read -r var; do
      [ -z "$var" ] && continue
      case "$var" in
        *roleToAssumeARN*|*role*arn*)
          pulumi config set "$var" "arn:aws:iam::123456789012:role/preview-$short_name" || true ;;
        *bucketName*|*bucket*)
          pulumi config set "$var" "preview-$short_name-$(date +%s | tail -c 4)" || true ;;
        *domain*|*Domain*)
          pulumi config set "$var" "preview-$short_name.example.com" || true ;;
        *pathToWebsiteContents*|*websitePath*)
          mkdir -p ./www 2>/dev/null || true
          pulumi config set "$var" "./www" || true ;;
        *twitter*|*Twitter*)
          pulumi config set "$var" "preview-$short_name" || true ;;
        *redshift*|*Redshift*|*cluster*)
          pulumi config set "$var" "preview-$short_name" || true ;;
        *)
          # Generic string placeholder for unknown config variables
          pulumi config set "$var" "preview-placeholder-$short_name" || true ;;
      esac
    done <<< "$missing_vars"
  fi
}

run_preview_with_retry() {
  local dir="$1"
  local project_name
  project_name=$(basename "$dir")
  
  # Remove any conflicting local stack config files with incompatible secrets
  rm -f Pulumi.preview.yaml 2>/dev/null || true
  
  # Initialize or select the preview stack
  if ! pulumi stack select preview >/dev/null 2>&1; then
    if ! pulumi stack init preview --non-interactive >/dev/null 2>&1; then
      echo "  Could not initialize stack"
      return 1
    fi
  fi
  
  # First attempt: try preview without any config seeding
  if pulumi preview --non-interactive 2>/dev/null; then
    return 0
  fi
  
  # Retry with automatic config seeding (up to 2 attempts)
  for attempt in 1 2; do
    echo "  Attempt $attempt: Seeding missing config..."
    seed_config "$project_name"
    
    if pulumi preview --non-interactive; then
      return 0
    fi
    
    # Final attempt failure is expected for examples requiring live AWS resources
    if [ "$attempt" = "2" ]; then
      echo "  Preview failed after config seeding - this may be expected for examples requiring live resources"
      return 1
    fi
  done
}

overall_pass=0
overall_fail=0

printf "\nChanged examples vs %s:\n" "$base_ref"
printf '%s\n' "$projects_sorted" | sed 's/^/- /'

# Optional: list-only mode for CI/debug
if [ "${DRY_LIST:-}" = "1" ]; then
  exit 0
fi

while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  proj_dir="$examples_root/$rel"
  name=$(sanitize "$rel")
  echo
echo "=== Testing: $rel ==="
  if [ ! -d "$proj_dir" ]; then
    echo "MISSING: $proj_dir"; overall_fail=$((overall_fail+1)); continue
  fi
  pushd "$proj_dir" >/dev/null
  rt=$(detect_runtime ".")
  echo "Runtime: $rt"
  install_deps "." "$rt" || true
  if run_preview_with_retry "."; then
    echo "RESULT: PASS ($rel)"; overall_pass=$((overall_pass+1))
  else
    echo "RESULT: FAIL ($rel)"; overall_fail=$((overall_fail+1))
  fi
  popd >/dev/null
done <<< "$projects_sorted"

echo
echo "Done. Passed: $overall_pass, Failed: $overall_fail"
