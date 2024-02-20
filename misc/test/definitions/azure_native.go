package definitions

import (
	"strings"
	"testing"
	"time"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

const AzureCloud Tag = "Azure"
const AzureNativeProvider Tag = "pulumi-azure-native"

func assertAppServiceResult(t *testing.T, output interface{}, check func(string) bool) bool {
	ready := func(body string) bool {
		// We got a welcome page from Azure App Service. This means the resource is deployed but our custom code is not
		// there yet. Wait a bit more and retry later.
		welcomePage := strings.Contains(body, "Your app service is up and running.")
		return !welcomePage
	}
	return helpers.AssertHTTPResultShapeWithRetry(t, output, nil, 5*time.Minute, ready, check)
}

func assertAppServiceResultContains(t *testing.T, output interface{}, str string) bool {
	return assertAppServiceResult(t, output, func(body string) bool {
		return assert.Contains(t, body, "Greetings from Azure App Service")
	})
}

var AzureNativeTests = TestDefinitions{
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, CS},
		Dir:  "azure-cs-appservice",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["Endpoint"], "Greetings from Azure App Service")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, CS},
		Dir:  "azure-cs-sqlserver",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["serverName"], "database.windows.net")
			},
		},
	},

	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Go},
		Dir:  "azure-go-aci",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["containerIPv4Address"], "Welcome to Azure Container Instances!")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Go},
		Dir:  "azure-go-call-azure-sdk",
	},

	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Python},
		Dir:  "azure-py-appservice",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["endpoint"], "Greetings from Azure App Service")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Python},
		Dir:  "azure-py-appservice-docker",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["helloEndpoint"], "Hello, world!")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Python},
		Dir:  "azure-py-webserver",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"username": "testuser",
				"password": "testTEST1234+-*/",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPHelloWorld(t, stack.Outputs["public_ip"], nil)
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, Python},
		Dir:  "azure-py-call-azure-sdk",
	},

	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, TS},
		Dir:  "azure-ts-appservice",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["endpoint"], "Greetings from Azure App Service")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, TS},
		Dir:  "azure-ts-appservice-docker",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResultContains(t, stack.Outputs["getStartedEndpoint"], "Azure App Service")
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, TS},
		Dir:  "azure-ts-functions",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Hello from Node.js, Pulumi")
				})
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, TS},
		Dir:  "azure-ts-webserver",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"username": "webmaster",
				"password": "MySuperS3cretPassw0rd",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPResult(t, stack.Outputs["ipAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureNativeProvider, TS},
		Dir:  "azure-ts-call-azure-sdk",
	},
}
