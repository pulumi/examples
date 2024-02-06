//go:build AzureNative || all
// +build AzureNative all

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

func TestAccAzureNative(t *testing.T) {
	for _, examples := range definitions.AzureNativeTests {
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
