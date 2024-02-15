//go:build AzureClassic || all
// +build AzureClassic all

package test

import (
	"testing"

	"github.com/pulumi/examples/misc/test/definitions"
)

func TestAccAzureClassic(t *testing.T) {
	for _, example := range definitions.GetTestsForTag("azure") {
		runAzure(t, example)
	}
}
