package helpers

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

// changedPathsEnvVar names the environment variable CI uses to scope a test run to the
// directories a pull request touched. It holds a whitespace-separated list of directories
// relative to the repository root, e.g. "aws-ts-s3-folder kubernetes-go-guestbook/simple".
//
// An unset *or empty* value means the run is unscoped and every test executes. Both spellings
// have to mean the same thing: the nightly sweep and a local `make only_test` leave it unset,
// while a workflow that assigns it from an empty job output sets it to "". Treating empty as
// "skip everything" would silently turn the full sweep into a no-op.
const changedPathsEnvVar = "PULUMI_CHANGED_PATHS"

// ProgramTest runs opts as an integration test, skipping it when the run has been scoped to
// a set of changed directories that does not cover opts.Dir.
//
// Tests must call this rather than integration.ProgramTest directly; a test that calls
// integration.ProgramTest opts out of PR scoping and will deploy on every pull request.
func ProgramTest(t *testing.T, opts *integration.ProgramTestOptions) {
	if dir, ok := skipUnchanged(t, opts.Dir); ok {
		t.Skipf("skipping %s: not modified by this pull request", dir)
	}

	integration.ProgramTest(t, opts)
}

// skipUnchanged reports whether the test targeting testDir should be skipped, along with
// the repo-relative directory used to make that decision (for the skip message).
func skipUnchanged(t *testing.T, testDir string) (string, bool) {
	changedPaths := strings.Fields(os.Getenv(changedPathsEnvVar))
	if len(changedPaths) == 0 {
		return "", false
	}

	// The repo root is two levels above misc/test, which is how every test builds its Dir.
	root := filepath.Join(GetCwd(t), "..", "..")
	rel, err := filepath.Rel(root, filepath.Clean(testDir))
	if err != nil || strings.HasPrefix(rel, "..") {
		// The test points outside the examples tree (or we can't tell where it points).
		// Fail open and run it rather than silently dropping coverage.
		return "", false
	}

	for _, c := range changedPaths {
		if onSamePathBranch(rel, c) {
			return rel, false
		}
	}

	return rel, true
}

// onSamePathBranch reports whether two slash-separated relative paths lie on the same
// branch of the directory tree -- that is, whether either is a prefix of the other.
//
// This gives the selection its granularity. A change inside one subproject of a
// multi-project example stays there:
//
//	"kubernetes-go-guestbook/simple" vs "kubernetes-go-guestbook/components" -> false
//
// while a change to a file shared above them fans out to each subproject beneath it:
//
//	"kubernetes-go-guestbook" vs "kubernetes-go-guestbook/simple" -> true
func onSamePathBranch(a, b string) bool {
	as := strings.Split(filepath.ToSlash(a), "/")
	bs := strings.Split(filepath.ToSlash(b), "/")

	n := len(as)
	if len(bs) < n {
		n = len(bs)
	}

	for i := 0; i < n; i++ {
		if as[i] != bs[i] {
			return false
		}
	}

	return true
}
