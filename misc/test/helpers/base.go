package helpers

import (
	"fmt"
	"os"
	"os/exec"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/engine"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func GetCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

// HCLPrepareProject readies an example written in HCL for ProgramTest. The integration
// harness has no built-in prepare step for the hcl runtime, so tests of `runtime: hcl`
// examples must set this as their PrepareProject. It runs `pulumi install`, which fetches
// the HCL language plugin and the bridged Terraform providers the example uses.
func HCLPrepareProject(projinfo *engine.Projinfo) error {
	cmd := exec.Command("pulumi", "install")
	cmd.Dir = projinfo.Root
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("pulumi install: %w\n%s", err, out)
	}
	return nil
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
