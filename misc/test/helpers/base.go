package helpers

import (
	"os"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func SkipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping long-running test in short mode")
	}
}

func GetCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

func GetBaseOptions(t *testing.T) integration.ProgramTestOptions {
	overrides, err := integration.DecodeMapString(os.Getenv("PULUMI_TEST_NODE_OVERRIDES"))
	if err != nil {
		t.FailNow()
	}

	base := integration.ProgramTestOptions{
		ExpectRefreshChanges:     true,
		Overrides:                overrides,
		RetryFailedSteps:         true,
		AllowEmptyPreviewChanges: true,
		AllowEmptyUpdateChanges:  true,
	}

	return base
}
