// +build packet all

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

func TestAccPacketTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "packet-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}
