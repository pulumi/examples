package definitions

import (
	"testing"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

var AzureTests = TestDefinitions{
	{
		Tags: []string{"azure", CS},
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
		Tags: []string{"azure", FS},
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
		Tags: []string{"azure", Go},
		Dir:  "classic-azure-go-webserver-component",
		Options: integration.ProgramTestOptions{
			Config: map[string]string{
				"username": "webmaster",
				"password": "Password1234!",
			},
		},
	},
	{
		Tags: []string{"azure", Python},
		Dir:  "classic-azure-py-arm-template",
	},
	{
		Tags: []string{"azure", Python},
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
		Tags: []string{"azure", TS},
		Dir:  "classic-azure-ts-arm-template",
	},
	{
		Tags: []string{"azure", TS},
		Dir:  "classic-azure-ts-stream-analytics",
	},
	{
		Tags: []string{"azure", TS},
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
