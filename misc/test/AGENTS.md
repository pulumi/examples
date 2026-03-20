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
5. Add `ExtraRuntimeValidation` if the example exposes an HTTP endpoint

## Build tags
Every `*_test.go` file (except `examples_test.go`) requires a build tag:
```go
//go:build Aws || all
```
Without the tag, the test won't run under `make specific_test_set`.

## Commands
- Build check: `go build -tags all ./...`
- Run one test: `go test -test.v -run "^TestAccAwsTsS3Folder$" -tags all`
- Run all for one cloud+lang: from repo root, `make specific_test_set TestSet=AwsTs`

## Test naming convention
`TestAcc` + cloud PascalCase + language PascalCase + name PascalCase.
Examples: `TestAccAwsGoFargate`, `TestAccGcpTsCloudRun`, `TestAccKubernetesGoGuestbook`.
