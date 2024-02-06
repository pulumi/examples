//go:build AzureNative || all
// +build AzureNative all

package test

import (
	"fmt"
	"os"
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

type ExampleTest struct {
	Dir     string
	Options integration.ProgramTestOptions
}

func (e *ExampleTest) run(t *testing.T) {
	t.Run(e.Dir, func(t *testing.T) {
		test := getAzureBase(t).
			With(e.Options).
			With(integration.ProgramTestOptions{
				Dir: path.Join(getCwd(t), "..", "..", "..", e.Dir),
			})

		integration.ProgramTest(t, &test)
	})
}

type PL string

const (
	CS   PL = "cs"
	FS   PL = "fs"
	GO   PL = "go"
	JAVA PL = "java"
	PY   PL = "py"
	TS   PL = "ts"
)

var AzureNativeTests = map[PL][]ExampleTest{
	CS: {
		{
			Dir: "azure-cs-appservice",
			Options: integration.ProgramTestOptions{
				Config: map[string]string{
					"sqlPassword": "2@Password@2",
				},
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["Endpoint"], func(body string) bool {
						return assert.Contains(t, body, "Greetings from Azure App Service")
					})
				},
			},
		},
		{
			Dir: "azure-cs-sqlserver",
			Options: integration.ProgramTestOptions{
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["serverName"], func(body string) bool {
						return assert.Contains(t, body, "database.windows.net")
					})
				},
			},
		},
	},
}

func TestAccFooCS(t *testing.T) {
	for _, example := range AzureNativeTests[CS] {
		example.run(t)
	}
}

func TestAccAzureNativeCsAppService(t *testing.T) {
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

func TestAccAzureNativeCsSqlServer(t *testing.T) {
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

func TestAccAzureNativeGoAci(t *testing.T) {
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

func TestAccAzureNativeGoCallAzureSdk(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-call-azure-sdk"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureNativePyAppService(t *testing.T) {
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

func TestAccAzureNativePyAppServiceDocker(t *testing.T) {
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

func TestAccAzureNativePyWebserver(t *testing.T) {
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

func TestAccAzureNativePyCallAzureSdk(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-call-azure-sdk"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureNativeTsAppService(t *testing.T) {
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

func TestAccAzureNativeTsAppServiceDocker(t *testing.T) {
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

func TestAccAzureNativeTsFunctions(t *testing.T) {
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

func TestAccAzureNativeTsWebserver(t *testing.T) {
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

func TestAccAzureNativeTsCallAzureSdk(t *testing.T) {
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
			"azure:environment":        azureEnviron,
			"azure-native:environment": azureEnviron,
			"azure:location":           azureLocation,
			"azure-native:location":    azureLocation,
		},
	})
	return azureBase
}
