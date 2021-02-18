// +build Azure_nextgen all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccAzureNextgenCsAci(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-nextgen-cs-aci"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["containerIPv4Address"], func(body string) bool {
					return assert.Contains(t, body, "Welcome to Azure Container Instances!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureNextgenCsAks(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-nextgen-cs-aks"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureNextgenCsAppServiceDocker(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-nextgen-cs-appservice-docker"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["GetStartedEndpoint"], func(body string) bool {
					return assert.Contains(t, body, "Azure App Service")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureNextgenCsFunctionsLinuxApp(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-nextgen-cs-functions-linux-app"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["Endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi")
				})
			},
		})

	integration.ProgramTest(t, &test)
}
