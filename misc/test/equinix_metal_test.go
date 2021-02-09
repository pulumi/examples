// +build equinix_metal all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
)

func TestAccPacketPyWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "packet-py-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEquinixMetalPyWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-metal-py-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccPacketTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "packet-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEquinixMetalTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-metal-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}
