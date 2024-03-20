//go:build EquinixMetal || all
// +build EquinixMetal all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccEquinixMetalPyWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-py-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEquinixMetalTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "equinix-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}
