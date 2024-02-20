//go:build Azure || all
// +build Azure all

package test

import (
	"fmt"
	"os"
	"path"
	"testing"

	"github.com/pulumi/examples/misc/test/definitions"
	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

var azureTests = definitions.GetTestsByTags(definitions.AzureCloud)

func TestAccAzureCs(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.CS)
}

func TestAccAzureFs(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.FS)
}

func TestAccAzureGo(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.Go)
}

func TestAccAzureJs(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.JS)
}

func TestAccAzurePy(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.Python)
}

func TestAccAzureTs(t *testing.T) {
	runAzureTestsForLanguage(t, definitions.TS)
}

func runAzureTestsForLanguage(t *testing.T, language definitions.Tag) {
	for _, example := range azureTests.GetByTags(language) {
		runAzure(t, example)
	}
}

func runAzure(t *testing.T, def definitions.TestDefinition) {
	t.Run(def.Dir, func(t *testing.T) {
		test := getAzureBase(t).
			With(def.Options).
			With(integration.ProgramTestOptions{
				Dir: path.Join(helpers.GetCwd(t), "..", "..", def.Dir),
			})

		integration.ProgramTest(t, &test)
	})
}

func getAzureEnvironment() string {
	azureEnviron := os.Getenv("ARM_ENVIRONMENT")
	if azureEnviron == "" {
		azureEnviron = "public"
		fmt.Println("Defaulting ARM_ENVIRONMENT to 'public'.  You can override using the ARM_ENVIRONMENT variable")
	}

	return azureEnviron
}

func getAzureLocation() string {
	azureLocation := os.Getenv("ARM_LOCATION")
	if azureLocation == "" {
		azureLocation = "westus"
		fmt.Println("Defaulting ARM_LOCATION to 'westus'.  You can override using the ARM_LOCATION variable")
	}

	return azureLocation
}

func getAzureBase(t *testing.T) integration.ProgramTestOptions {
	azureEnviron := getAzureEnvironment()
	azureLocation := getAzureLocation()
	base := getBaseOptions(t)
	azureBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"azure:environment":        azureEnviron,
			"azure-native:environment": azureEnviron,
			"azure:location":           azureLocation,
			"azure-native:location":    azureLocation,
		},
	})
	return azureBase
}
