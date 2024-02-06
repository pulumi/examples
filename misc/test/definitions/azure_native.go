package definitions

import (
	"strings"
	"testing"
	"time"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func assertAppServiceResult(t *testing.T, output interface{}, check func(string) bool) bool {
	ready := func(body string) bool {
		// We got a welcome page from Azure App Service. This means the resource is deployed but our custom code is not
		// there yet. Wait a bit more and retry later.
		welcomePage := strings.Contains(body, "Your app service is up and running.")
		return !welcomePage
	}
	return helpers.AssertHTTPResultShapeWithRetry(t, output, nil, 5*time.Minute, ready, check)
}

type ExampleTest struct {
	Dir     string
	Options integration.ProgramTestOptions
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
	GO: {
		{
			Dir: "azure-go-aci",
			Options: integration.ProgramTestOptions{
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["containerIPv4Address"], func(body string) bool {
						return assert.Contains(t, body, "Welcome to Azure Container Instances!")
					})
				},
			},
		},
		{
			Dir: "azure-go-call-azure-sdk",
		},
	},
	PY: {
		{
			Dir: "azure-py-appservice",
			Options: integration.ProgramTestOptions{
				Config: map[string]string{
					"sqlPassword": "2@Password@2",
				},
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
						return assert.Contains(t, body, "Greetings from Azure App Service")
					})
				},
			},
		},
		{
			Dir: "azure-py-appservice-docker",
			Options: integration.ProgramTestOptions{
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["helloEndpoint"], func(body string) bool {
						return assert.Contains(t, body, "Hello, world!")
					})
				},
			},
		},
		{
			Dir: "azure-py-webserver",
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
			Dir: "azure-py-call-azure-sdk",
		},
	},
	TS: {
		{
			Dir: "azure-ts-appservice",
			Options: integration.ProgramTestOptions{
				Config: map[string]string{
					"sqlPassword": "2@Password@2",
				},
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
						return assert.Contains(t, body, "Greetings from Azure App Service")
					})
				},
			},
		},
		{
			Dir: "azure-ts-appservice-docker",
			Options: integration.ProgramTestOptions{
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					assertAppServiceResult(t, stack.Outputs["getStartedEndpoint"], func(body string) bool {
						return assert.Contains(t, body, "Azure App Service")
					})
				},
			},
		},
		{
			Dir: "azure-ts-functions",
			Options: integration.ProgramTestOptions{
				ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
					helpers.AssertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
						return assert.Contains(t, body, "Hello from Node.js, Pulumi")
					})
				},
			},
		},
		{
			Dir: "azure-ts-webserver",
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
			Dir: "azure-ts-call-azure-sdk",
		},
	},
}
