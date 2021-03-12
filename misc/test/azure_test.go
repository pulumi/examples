// +build Azure all

package test

import (
	"fmt"
	"os"
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
	"github.com/stretchr/testify/assert"
)

// All examples `ls | grep azure` will be tested for basic sanity.
// Only configure an entry below for an example if it needs custom
// config values or checks.
var tests []test = []test{
	defTest("azure-cs-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("Endpoint", "Greetings from Azure App Service"),

	defTest("classic-azure-cs-webserver").
		checkHttp("IpAddress", "Hello, World"),

	defTest("classic-azure-fs-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("azure-go-aci").
		checkAppService("endpoint", "Hello, containers!"),

	defTest("classic-azure-go-webserver-component").
		conf("username", "webmaster").
		conf("password", "Password1234!"),

	defTest("azure-py-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("azure-py-appservice-docker").
		checkAppService("helloEndpoint", "Hello, world!"),

	defTest("classic-azure-py-vm-scaleset").
		checkHttp("public_address", "nginx"),

	defTest("azure-py-webserver").
		conf("username", "testuser").
		conf("password", "testTEST1234+-*/").
		checkHttp("public_ip", "Hello, World!"),

	defTest("azure-ts-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("azure-ts-appservice-docker").
		checkAppService("getStartedEndpoint", "Azure App Service"),

	defTest("azure-ts-functions").
		checkHttp("endpoint", "Hello from Node.js, Pulumi"),

	defTest("classic-azure-ts-vm-scaleset").
		checkHttp("publicAddress", "nginx"),

	defTest("azure-ts-webserver").
		conf("username", "webmaster").
		conf("password", "MySuperS3cretPassw0rd").
		checkHttp("ipAddress", "Hello, World"),
}

// table-drivent test

func TestAccAll(t *testing.T) {
	byName := make(map[string]test)

	// run everything from tests var
	for _, example := range tests {
		byName[example.name] = example
		example.run(t)
	}

	// run auto-discovered tests, exlcuding ones in the tests var
	for _, example := range discoverAzureTests(t) {
		_, alreadySeen := byName[example.name]
		if !alreadySeen {
			example.run(t)
		}
	}
}

// support functions

type test struct {
	name string
	opts integration.ProgramTestOptions
}

func (x test) conf(name string, value string) test {
	t.opts.ProgramTestOptions[name] = value
	return x
}

func (x test) checkHttp(endpointOutputName string, expectedBodyText string) test {
	x.opts.ExtraRuntimeValidation = func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		assertHTTPResult(t, stack.Outputs[endpointOutputName].(string), nil, func(body string) bool {
			return assert.Contains(t, body, expectedBodyText)
		})
	}
	return x
}

func (x test) checkAppService(endpointOutputName string, expectedBodyText string) test {
	x.ops.ExtraRuntimeValidation = func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		assertAppServiceResult(t, stack.Outputs["getStartedEndpoint"], func(body string) bool {
			return assert.Contains(t, body, "Azure App Service")
		})
	}
	return x
}

func (x test) run(t *testing.T) {
	t.Run(x.name, func(t *tesing.T) {
		test := getAzureBase(t).With(x.opts)
		integration.ProgramTest(t, &test)
	})
}

func defTest(testName stinrg) test {
	return test{
		name: testName,
		opts: &integration.ProgramTestOptions{
			Dir:    path.Join(getCwd(t), "..", "..", testName),
			Config: map[string]string{},
		},
	}
}

func discoverAzureTests(t *testing.T) []test {
	var found []test

	files, err := os.ReadDir("../../..")
	if err != nil {
		t.Error(err)
	}

	for _, f := range files {
		name := f.Name()
		if f.IsDir() && strings.Contains(name, "azure") {
			found = append(found, defTest(name))
		}
	}

	if len(found) == 0 {
		t.Errorf("Did not discover any azure tests. Something wrong with relative paths?")
	}

	return found
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
