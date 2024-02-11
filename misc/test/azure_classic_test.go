//go:build AzureClassic || all
// +build AzureClassic all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/examples/misc/test/definitions"
	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccAzureClassic(t *testing.T) {
	for _, examples := range definitions.GetTestsForTag("azure") {
		for _, example := range examples {
			run(t, example)
		}
	}
}

func run(t *testing.T, e definitions.ExampleTest) {
	t.Run(e.Dir, func(t *testing.T) {
		test := getAzureBase(t).
			With(e.Options).
			With(integration.ProgramTestOptions{
				Dir: path.Join(helpers.GetCwd(t), "..", "..", "..", e.Dir),
			})

		integration.ProgramTest(t, &test)
	})
}
