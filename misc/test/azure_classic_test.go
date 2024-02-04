//go:build AzureClassic || all
// +build AzureClassic all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccAzureClassicCsWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-cs-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["IpAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicFsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-fs-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicGoWebserverComponent(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-go-webserver-component"),
			Config: map[string]string{
				"username": "webmaster",
				"password": "Password1234!",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicPyArmTemplate(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-py-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicPyVmScaleSet(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-py-vm-scaleset"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["public_address"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "nginx")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicTsArmTemplate(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-ts-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicTsStreamAnalytics(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-ts-stream-analytics"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureClassicTsVmScaleset(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-ts-vm-scaleset"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["publicAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "nginx")
				})
			},
		})

	integration.ProgramTest(t, &test)
}
