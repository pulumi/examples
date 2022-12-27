//go:build Azure || all
// +build Azure all

package test

import (
	"fmt"
	"os"
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccAzureCsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["Endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureCsWebserver(t *testing.T) {
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

func TestAccAzureCsSqlServer(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-sqlserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["serverName"], func(body string) bool {
					return assert.Contains(t, body, "database.windows.net")
				})
			},
		})
	integration.ProgramTest(t, &test)
}

func TestAccAzureFsAppService(t *testing.T) {
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

func TestAccAzureGoAci(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-aci"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["containerIPv4Address"], func(body string) bool {
					return assert.Contains(t, body, "Welcome to Azure Container Instances!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureGoWebserverComponent(t *testing.T) {
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

func TestAccAzureGoCallAzureSdk(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-call-azure-sdk"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-appservice"),
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

func TestAccAzurePyAppServiceDocker(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-appservice-docker"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["helloEndpoint"], func(body string) bool {
					return assert.Contains(t, body, "Hello, world!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyArmTemplate(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-py-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyVmScaleSet(t *testing.T) {
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

func TestAccAzurePyWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-webserver"),
			Config: map[string]string{
				"username": "testuser",
				"password": "testTEST1234+-*/",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["public_ip"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyCallAzureSdk(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-call-azure-sdk"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-appservice"),
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

func TestAccAzureTsAppServiceDocker(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-appservice-docker"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["getStartedEndpoint"], func(body string) bool {
					return assert.Contains(t, body, "Azure App Service")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsArmTemplate(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-ts-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsFunctions(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Hello from Node.js, Pulumi")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsStreamAnalytics(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "classic-azure-ts-stream-analytics"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsVmScaleset(t *testing.T) {
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

func TestAccAzureTsWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-webserver"),
			Config: map[string]string{
				"username": "webmaster",
				"password": "MySuperS3cretPassw0rd",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ipAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsCallAzureSdk(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-call-azure-sdk"),
		})

	integration.ProgramTest(t, &test)
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
			"azure:environment":     azureEnviron,
			"azure:location":        azureLocation,
			"azure-native:location": azureLocation,
		},
	})
	return azureBase
}
