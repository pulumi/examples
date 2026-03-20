## Summary
<!-- What changed and why. Link to issue if applicable. -->

## Example(s) affected
<!-- List the example directory name(s) this PR touches, e.g., aws-ts-s3-folder -->

## Validation
<!-- Commands you ran and their output. Copy-paste, don't paraphrase. -->
- [ ] Python formatting: `make check_python_formatting` (if Python files changed)
- [ ] TypeScript lint: `tslint -c tslint.json <files>` (if TS files changed)
- [ ] Integration test: `make test_example.TestAcc<Name>` (if example code changed)
- [ ] PR preview: `make pr_preview` (for bulk changes)

## Checklist
- [ ] Example directory follows `<cloud>-<lang>-<name>` naming convention
- [ ] `Pulumi.yaml` has correct `runtime:` field
- [ ] `README.md` follows the [example template](../example-readme-template.md.txt)
- [ ] No hardcoded credentials or secrets
- [ ] No `Pulumi.*.yaml` stack config files included
- [ ] Integration test added/updated in `misc/test/` (for new examples)
