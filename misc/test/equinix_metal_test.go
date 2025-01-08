// +build equinix all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccEquinixPyWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-py-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEquinixTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}
