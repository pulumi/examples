#!/usr/bin/env bash
set -euo pipefail

# Works out which examples a pull request touched, and which integration test sets need to
# run as a result. Used by .github/workflows/pull-request.yml to build a dynamic matrix; run
# it directly (or via `make changed_examples`) to preview the selection locally.
#
# Outputs, written to $GITHUB_OUTPUT when running under Actions:
#   changed-paths   whitespace-separated changed directories, for PULUMI_CHANGED_PATHS
#   test-sets       JSON array of TestSet names for the providers matrix, e.g. ["AwsTs"]
#   run-kubernetes  "true" if any kubernetes-* example changed
#
# The nightly sweep in test-examples.yml does not use this script -- it always runs
# everything, so untouched examples still get exercised daily.

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

# Cloud directory prefix -> TestSet prefix. Anything not listed here has no integration
# test set (alicloud-*, docker-*, linode-*, openstack-*, testing-*, ...).
cloud_test_set() {
  case "$1" in
    aws)           echo Aws ;;
    azure)         echo Azure ;;
    classic-azure) echo Azure ;;
    gcp)           echo Gcp ;;
    digitalocean)  echo DigitalOcean ;;
    kubernetes)    echo Kubernetes ;;
    *)             echo "" ;;
  esac
}

# Language directory token -> TestSet suffix.
lang_test_set() {
  case "$1" in
    ts)   echo Ts ;;
    py)   echo Py ;;
    cs)   echo Cs ;;
    fs)   echo Fs ;;
    go)   echo Go ;;
    js)   echo Js ;;
    java) echo Java ;;
    yaml) echo Yaml ;;
    *)    echo "" ;;
  esac
}

# Changes to the harness, the CI definitions, or repo-wide tooling can affect any example,
# so they fall back to the full sweep rather than a scoped run.
is_shared_path() {
  case "$1" in
    misc/test/*|.github/*|scripts/*|Makefile|package.json|package-lock.json|black.toml|eslint.config.*)
      return 0 ;;
    *)
      return 1 ;;
  esac
}

# The combos the nightly matrix runs. Used when a shared path forces a full sweep.
all_test_sets() {
  local cloud lang
  for cloud in DigitalOcean Aws Azure Gcp; do
    for lang in Cs Ts Py Fs; do
      echo "${cloud}${lang}"
    done
  done
}

# Determine what to diff against. CI passes the PR base; locally we fall back to the merge
# base with master. Three-dot semantics matter here: a plain `git diff master` would also
# report changes that landed on master after this branch was cut.
base_sha=${BASE_SHA:-}
if [ -z "$base_sha" ]; then
  for cand in origin/master origin/main master main; do
    if git rev-parse --verify -q "$cand" >/dev/null; then
      base_sha=$(git merge-base "$cand" HEAD)
      break
    fi
  done
fi

if [ -z "$base_sha" ]; then
  echo "error: could not determine a base commit to diff against; set BASE_SHA" >&2
  exit 1
fi

changed_files=$(git diff --name-only "$base_sha...HEAD")

# Locally, also count work that isn't committed yet, so `make changed_examples` is useful
# while you're still editing. CI diffs committed history only, so its selection stays
# reproducible from the commit alone.
if [ -z "${GITHUB_ACTIONS:-}" ]; then
  changed_files=$(printf '%s\n%s\n%s\n%s\n' \
    "$changed_files" \
    "$(git diff --name-only --cached)" \
    "$(git diff --name-only)" \
    "$(git ls-files --others --exclude-standard)" | sed '/^$/d' | sort -u)
fi

changed_dirs=()
example_roots=()
test_sets=()
no_test_set=()
force_full=false

while IFS= read -r file; do
  [ -n "$file" ] || continue

  if is_shared_path "$file"; then
    force_full=true
    continue
  fi

  root=${file%%/*}
  # A top-level file (README.md, CONTRIBUTING.md, ...) belongs to no example.
  [ "$root" != "$file" ] || continue
  [ -d "$root" ] || continue

  # Record the directory rather than the file, so PULUMI_CHANGED_PATHS stays small on wide
  # PRs while keeping enough depth to tell one subproject from its siblings.
  changed_dirs+=("$(dirname "$file")")
  example_roots+=("$root")

  # Language is not always the second segment: aws-apigateway-go-routes puts it third.
  IFS='-' read -r -a segments <<< "$root"
  cloud=${segments[0]}
  if [ "$cloud" = "classic" ] && [ "${#segments[@]}" -gt 1 ]; then
    cloud="classic-${segments[1]}"
  fi

  cloud_set=$(cloud_test_set "$cloud")
  lang_set=""
  for segment in "${segments[@]}"; do
    lang_set=$(lang_test_set "$segment")
    [ -z "$lang_set" ] || break
  done

  if [ -n "$cloud_set" ] && [ -n "$lang_set" ]; then
    test_sets+=("${cloud_set}${lang_set}")
  else
    no_test_set+=("$root")
  fi
done <<< "$changed_files"

dedupe() {
  [ "$#" -gt 0 ] || return 0
  printf '%s\n' "$@" | sort -u
}

if [ "$force_full" = true ]; then
  changed_paths=""
  selected_sets=$(all_test_sets | sort -u)
  run_kubernetes=true
  reason="a shared path changed (harness, CI, or repo-wide tooling), so every example is in scope"
else
  changed_paths=$(dedupe "${changed_dirs[@]-}" | tr '\n' ' ' | sed 's/ $//')
  run_kubernetes=false
  reason="scoped to the examples this pull request touched"

  # Only emit a test set that has a matching test function. This drops combos like
  # AzureJava, where definitions/ carries a Java tag but no TestAccAzureJava runner exists.
  selected_sets=""
  while IFS= read -r set; do
    [ -n "$set" ] || continue
    if [ "$set" = "${set#Kubernetes}" ]; then
      if grep -qs "^func TestAcc${set}" misc/test/*.go; then
        selected_sets+="${set}"$'\n'
      else
        no_test_set+=("$set")
      fi
    else
      # Kubernetes has its own job rather than a matrix entry.
      run_kubernetes=true
    fi
  done <<< "$(dedupe "${test_sets[@]-}")"
  selected_sets=$(printf '%s' "$selected_sets" | sed '/^$/d')
fi

# Render the test sets as a JSON array for `fromJson` in the matrix.
if [ -n "$selected_sets" ]; then
  test_sets_json=$(printf '%s\n' "$selected_sets" | sed '/^$/d' \
    | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1 ? "," : ""), $0} END{printf "]"}')
else
  test_sets_json="[]"
fi

if [ "$force_full" = true ]; then
  # An empty PULUMI_CHANGED_PATHS would skip everything, so the full sweep leaves it unset.
  changed_paths_display="(unset - every example is in scope)"
else
  changed_paths_display="${changed_paths:-(none - no example was touched)}"
fi

echo "Base commit:    $base_sha"
echo "Selection:      $reason"
echo "Test sets:      $test_sets_json"
echo "Kubernetes:     $run_kubernetes"
echo "Changed paths:  $changed_paths_display"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "changed-paths=$changed_paths"
    echo "test-sets=$test_sets_json"
    echo "run-kubernetes=$run_kubernetes"
  } >> "$GITHUB_OUTPUT"
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Integration test scope"
    echo
    echo "$reason"
    echo
    echo "| | |"
    echo "|---|---|"
    echo "| Test sets | \`$test_sets_json\` |"
    echo "| Kubernetes | \`$run_kubernetes\` |"
    echo

    roots=$(dedupe "${example_roots[@]-}")
    if [ -n "$roots" ]; then
      echo "### Examples changed"
      echo
      while IFS= read -r root; do
        [ -n "$root" ] || continue
        # An example with no reference in misc/test has no integration test at all. Report
        # it so the gap is visible, but don't fail -- most examples are in this state.
        if grep -qrs "\"$root\"" misc/test/; then
          echo "- \`$root\`"
        else
          echo "- \`$root\` — no integration test covers this example"
        fi
      done <<< "$roots"
      echo
    fi

    skipped=$(dedupe "${no_test_set[@]-}")
    if [ -n "$skipped" ]; then
      echo "### Not covered by any test set"
      echo
      while IFS= read -r item; do
        [ -n "$item" ] || continue
        echo "- \`$item\`"
      done <<< "$skipped"
      echo
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi
