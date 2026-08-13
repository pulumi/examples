# Integration Test Harness

Go test suite that deploys and destroys every Pulumi example as an integration test. Uses `pulumi/pulumi/pkg/v3/testing/integration`.

## How tests are organized
- `examples_test.go` — shared helpers (`getCwd`, `getBaseOptions`, `getAWSBase`)
- `aws_test.go` — AWS example tests (build tag: `Aws || all`)
- `azure_test.go` — Azure tests (build tag: `Azure || all`)
- `google_test.go` — GCP tests (build tag: `Gcp || all`)
- `kubernetes_test.go` — Kubernetes tests (build tag: `Kubernetes || all`)
- `digitalocean_test.go` — DigitalOcean tests (build tag: `DigitalOcean || all`)
- `definitions/` — tag-based test definitions (currently Azure only)
- `helpers/` — HTTP assertion and path utilities

## Adding a test for a new example
1. Open the `<cloud>_test.go` file matching your example's cloud
2. Add a function named `TestAcc<Cloud><Lang><Name>` (e.g., `TestAccAwsTsMyApp`)
3. Use the cloud-specific base: `getAWSBase(t)`, `getGoogleBase(t)`, etc.
4. Set `Dir:` to `path.Join(getCwd(t), "..", "..", "<example-dir>")`
5. Run it with **`helpers.ProgramTest(t, &test)`**, not `integration.ProgramTest`
6. Add `ExtraRuntimeValidation` if the example exposes an HTTP endpoint

## Always call helpers.ProgramTest

`helpers.ProgramTest` is a thin wrapper that skips the test when the run has been scoped to
the examples a pull request changed. A test that calls `integration.ProgramTest` directly
still works, but it opts out of that scoping and will deploy on **every** pull request.

The scope comes from `PULUMI_CHANGED_PATHS`, a whitespace-separated list of directories
relative to the repo root, set by `.github/workflows/pull-request.yml`. Unset or empty means
unscoped — every test runs, which is what the nightly sweep and `make only_test` rely on.

Matching is on path branches, not example names, so the subprojects of a multi-project
example are independent: a change under `kubernetes-go-guestbook/simple` does not deploy
`kubernetes-go-guestbook/components`, while a change to a file directly under
`kubernetes-go-guestbook/` covers both. See `helpers/changed.go` and its tests.

`performance_test.go` is intentionally exempt — it's tagged `Performance`, is not in either
CI matrix, and its benchmarks aren't example directories.

Check what a branch would run with `make changed_examples` from the repo root, or directly:

```
PULUMI_CHANGED_PATHS="aws-ts-s3-folder" go test -tags all -run TestAccAwsTs -v
```

## Build tags
Every `*_test.go` file (except `examples_test.go`) requires a build tag:
```go
//go:build Aws || all
```
Without the tag, the test won't run under `make specific_test_set`.

## Commands
- Build check: `go build -tags all ./...`
- Helper unit tests: `go test ./helpers/...`
- Run one test: `go test -test.v -run "^TestAccAwsTsS3Folder$" -tags all`
- Run all for one cloud+lang: from repo root, `make specific_test_set TestSet=AwsTs`

## Test naming convention
`TestAcc` + cloud PascalCase + language PascalCase + name PascalCase.
Examples: `TestAccAwsGoFargate`, `TestAccGcpTsCloudRun`, `TestAccKubernetesGoGuestbook`.
