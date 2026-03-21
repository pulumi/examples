<!-- FOR AI AGENTS - Human readability is a side effect, not a goal -->
<!-- Managed by agent: keep sections and order; edit content, not structure -->
<!-- Last updated: 2026-03-21 -->

# Pulumi Examples

**Precedence:** the **closest `AGENTS.md`** to the files you're changing wins. Root holds global defaults only.

Collection of 300+ Pulumi infrastructure-as-code examples spanning AWS, Azure, GCP, Kubernetes, and DigitalOcean in TypeScript, Python, Go, C#, F#, Java, and YAML. Each example is a standalone Pulumi project that users clone and deploy.

## Start here
- `CONTRIBUTING.md` — folder naming convention and README structure rules
- `Makefile` — test, format, and validation targets
- `misc/test/` — Go integration test harness (all examples are tested here)
- `example-readme-template.md.txt` — canonical README template for new examples
- `.github/workflows/test-examples.yml` — CI configuration
- `scripts/pr-preview-changed.sh` — PR-scoped preview validation

## Index of scoped AGENTS.md

| Directory | Focus |
|-----------|-------|
| [`misc/test/`](./misc/test/AGENTS.md) | Integration test harness — test naming, build tags, cloud-specific base helpers |

> **Agents**: When you read or edit files in a listed directory, you **must** load its AGENTS.md first. It contains directory-specific conventions that override this root file.

## Commands
> Source: `Makefile` + `.github/workflows/test-examples.yml`

| Task | Command | Notes |
|------|---------|-------|
| Format Python | `make format` | Black, line-length 100 |
| Check Python formatting | `make check_python_formatting` | CI gate |
| Install test deps | `make ensure` | Go modules + npm |
| Run all integration tests | `make only_test` | ~4h, 40 parallel |
| Run one test | `make test_example.TestAccAwsPyS3Folder` | |
| Run cloud+lang set | `make specific_test_set TestSet=AwsTs` | |
| PR preview (changed only) | `make pr_preview` | |
| Lint TypeScript | `tslint -c tslint.json **/*.ts` | CI gate |

## Repository Structure
- `<cloud>-<lang>-<name>/` — individual Pulumi examples (300+ directories)
- `misc/test/` — Go integration tests that deploy/destroy each example
- `testing-unit-*/` — language-specific unit test examples
- `testing-integration*/` — integration testing examples
- `policy-packs/` — Pulumi policy-as-code examples
- `scripts/` — CI helper scripts
- `.github/` — CI workflows and setup action

## Naming Convention
Every example directory follows: `<cloud>-<language>-<descriptive-name>`

| Prefix | Meaning |
|---|---|
| `aws`, `azure`, `gcp`, `kubernetes`, `digitalocean` | Cloud provider |
| `ts`, `js`, `py`, `go`, `cs`, `fs`, `java`, `yaml` | Language |
| `classic-azure-*` | Uses the older `pulumi-azure` (not `azure-native`) |

## Example Structure
Every example directory must contain:
- `Pulumi.yaml` — project definition with `runtime:` field (nodejs/python/go/dotnet/yaml)
- `README.md` — follows `example-readme-template.md.txt` structure
- Language-specific entry point (`index.ts`, `__main__.py`, `main.go`, `Program.cs`, `Pulumi.yaml`)
- Language-specific dependency file (`package.json`, `requirements.txt`, `go.mod`, `*.csproj`)

Optional: `www/` (static content), `images/` (screenshots/recordings)

## Code Conventions

### TypeScript copyright header (required)
All `.ts` files must start with: `// Copyright YYYY(-YYYY), Pulumi Corporation.`
Enforced by `tslint.json` `file-header` rule. CI will fail without it.

### Python formatting
Black (line-length 100, skip string normalization). Config: `black.toml`. CI: `make check_python_formatting`.

### TypeScript style
Double quotes, trailing commas, semicolons. `prefer-const`, `no-var-keyword`, ordered imports. Full config: `tslint.json`.

### Indentation
TypeScript/JSON: 2 spaces | Python/C#: 4 spaces | Go: tabs | YAML: 2 spaces (`.editorconfig`)

### Forbidden Patterns
- `Pulumi.*.yaml` config files — gitignored, never commit stack configs
- Hardcoded cloud credentials or secrets in example code
- Examples that `import` from other example directories — each is standalone
- Editing `misc/test/` without running the corresponding test
- Committing `node_modules/`, `venv/`, `bin/`, `vendor/`, or build artifacts

## Adding a New Example

1. Create directory following `<cloud>-<lang>-<name>` naming
2. Add `Pulumi.yaml` with correct `runtime:` field
3. Write the infrastructure code with appropriate entry point
4. Add `README.md` using the template in `example-readme-template.md.txt`
5. Add an integration test in `misc/test/<cloud>_test.go`
6. Run `make test_example.TestAcc<YourTestName>` to verify
7. If Python: run `make check_python_formatting`
8. If TypeScript: ensure copyright header is present

## If you change...

| What changed | Run |
|---|---|
| Any Python file | `make check_python_formatting` |
| Any TypeScript file | `tslint -c tslint.json <file>` (check copyright header) |
| A specific example | `make test_example.TestAcc<TestName>` |
| `misc/test/*.go` | `cd misc/test && go build -tags all ./...` |
| `Makefile` | Verify the changed target runs successfully |
| `scripts/` | `make pr_preview` (with DRY_LIST=1 for a dry run) |

## Escalate immediately if
- Changing `misc/test/examples_test.go` or test helpers (affects all tests)
- Adding a new cloud provider prefix not in the naming table
- Modifying `.github/workflows/` or `.github/actions/` (affects CI for all examples)
- Changing `Makefile` targets (affects CI pipeline)
- An example requires new external dependencies or cloud services not already used
- Tests fail after two debugging attempts

## When instructions conflict
The nearest `AGENTS.md` wins. Explicit user prompts override files.
