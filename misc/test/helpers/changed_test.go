package helpers

import (
	"path/filepath"
	"testing"
)

// An unset or empty PULUMI_CHANGED_PATHS must run everything. If empty ever came to mean
// "skip everything", the nightly sweep would quietly stop testing anything, because a
// workflow that assigns the variable from an empty job output sets it to "".
func TestUnscopedRunsEverything(t *testing.T) {
	dir := filepath.Join(GetCwd(t), "..", "..", "aws-ts-s3-folder")

	for _, value := range []string{"", "   "} {
		t.Setenv(changedPathsEnvVar, value)
		if _, skip := skipUnchanged(t, dir); skip {
			t.Errorf("%s=%q: skipped a test, want everything to run", changedPathsEnvVar, value)
		}
	}

	t.Setenv(changedPathsEnvVar, "gcp-py-functions")
	if _, skip := skipUnchanged(t, dir); !skip {
		t.Error("a scoped run should skip an example that was not changed")
	}
}

func TestSkipUnchangedMatchesOnPathBranch(t *testing.T) {
	cases := []struct {
		changed string
		testDir string
		skip    bool
	}{
		{changed: "aws-ts-s3-folder", testDir: "aws-ts-s3-folder", skip: false},
		{changed: "aws-ts-s3-folder/www", testDir: "aws-ts-s3-folder", skip: false},
		{changed: "kubernetes-go-guestbook/simple", testDir: "kubernetes-go-guestbook/simple", skip: false},
		{changed: "kubernetes-go-guestbook/simple", testDir: "kubernetes-go-guestbook/components", skip: true},
		{changed: "kubernetes-go-guestbook", testDir: "kubernetes-go-guestbook/components", skip: false},
		{changed: "aws-ts-s3-folder gcp-py-functions", testDir: "gcp-py-functions", skip: false},
	}

	for _, c := range cases {
		t.Run(c.changed+"->"+c.testDir, func(t *testing.T) {
			t.Setenv(changedPathsEnvVar, c.changed)
			dir := filepath.Join(GetCwd(t), "..", "..", c.testDir)
			if _, skip := skipUnchanged(t, dir); skip != c.skip {
				t.Errorf("skipUnchanged(%q) with changed=%q = %v, want %v",
					c.testDir, c.changed, skip, c.skip)
			}
		})
	}
}

// A test whose Dir resolves outside the repository must fail open rather than silently
// lose coverage, since we can't tell which example it corresponds to.
func TestOutsideRepositoryRuns(t *testing.T) {
	t.Setenv(changedPathsEnvVar, "aws-ts-s3-folder")

	if _, skip := skipUnchanged(t, filepath.Join(t.TempDir(), "elsewhere")); skip {
		t.Error("skipped a test pointing outside the repository, want it to run")
	}
}

func TestOnSamePathBranch(t *testing.T) {
	cases := []struct {
		name     string
		testDir  string
		changed  string
		expected bool
	}{
		{
			name:     "identical single-segment example",
			testDir:  "aws-ts-s3-folder",
			changed:  "aws-ts-s3-folder",
			expected: true,
		},
		{
			name:     "change below the test root",
			testDir:  "aws-ts-s3-folder",
			changed:  "aws-ts-s3-folder/www",
			expected: true,
		},
		{
			name:     "identical subproject",
			testDir:  "kubernetes-go-guestbook/simple",
			changed:  "kubernetes-go-guestbook/simple",
			expected: true,
		},
		{
			name:     "sibling subprojects do not match",
			testDir:  "kubernetes-go-guestbook/simple",
			changed:  "kubernetes-go-guestbook/components",
			expected: false,
		},
		{
			name:     "shared file above the subprojects fans out",
			testDir:  "kubernetes-go-guestbook/simple",
			changed:  "kubernetes-go-guestbook",
			expected: true,
		},
		{
			name:     "unrelated examples",
			testDir:  "aws-ts-s3-folder",
			changed:  "gcp-py-functions",
			expected: false,
		},
		{
			name:     "prefix of a name is not a path prefix",
			testDir:  "aws-ts-s3-folder",
			changed:  "aws-ts-s3-folder-component",
			expected: false,
		},
		{
			name:     "assume-role subproject",
			testDir:  "aws-go-assume-role/create-role",
			changed:  "aws-go-assume-role/create-role",
			expected: true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if actual := onSamePathBranch(c.testDir, c.changed); actual != c.expected {
				t.Errorf("onSamePathBranch(%q, %q) = %v, want %v",
					c.testDir, c.changed, actual, c.expected)
			}
		})
	}
}

func TestOnSamePathBranchIsSymmetric(t *testing.T) {
	pairs := [][2]string{
		{"kubernetes-go-guestbook", "kubernetes-go-guestbook/simple"},
		{"kubernetes-go-guestbook/simple", "kubernetes-go-guestbook/components"},
		{"aws-ts-s3-folder", "aws-ts-s3-folder"},
		{"aws-ts-s3-folder", "gcp-py-functions"},
	}

	for _, p := range pairs {
		if onSamePathBranch(p[0], p[1]) != onSamePathBranch(p[1], p[0]) {
			t.Errorf("onSamePathBranch is not symmetric for %q and %q", p[0], p[1])
		}
	}
}
