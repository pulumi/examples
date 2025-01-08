package definitions

import (
	"testing"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

const AzureClassicProvider Tag = "pulumi-azure"

var AzureTests = TestDefinitions{
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, CS},
		Dir:  "classic-azure-cs-webserver",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPResult(t, stack.Outputs["IpAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, FS},
		Dir:  "classic-azure-fs-appservice",
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
		Tags: []Tag{AzureCloud, AzureClassicProvider, Go},
		Dir:  "classic-azure-go-webserver-component",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"username": "webmaster",
				"password": "Password1234!",
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, Python},
		Dir:  "classic-azure-py-arm-template",
	},
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, Python},
		Dir:  "classic-azure-py-vm-scaleset",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPResult(t, stack.Outputs["public_address"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "nginx")
				})
			},
		},
	},
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, TS},
		Dir:  "classic-azure-ts-stream-analytics",
	},
	{
		Tags: []Tag{AzureCloud, AzureClassicProvider, TS},
		Dir:  "classic-azure-ts-vm-scaleset",
		Options: integration.ProgramTestOptions{
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				helpers.AssertHTTPResult(t, stack.Outputs["publicAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "nginx")
				})
			},
		},
	},
}
