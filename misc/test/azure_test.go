// +build Azure all

package test

import (
	"fmt"
	"os"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
)

// Only configure an entry below for an example if it needs custom
// config values or checks. Examples without entries in this table
// will be checked for basic sanity (such as, does `pulumi up` work).
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

// Table-drivent test entry points.
//
// Note TestAccAzure$LANG pattern is used by GitHub Actions to run
// specific checks. For example we may be called with:
//
//     go test .. --run-TestAccAzurePy

func TestAccAzureJs(t *testing.T) {
	checkExamples(t, "azure-js", tests, getAzureBase)
}

func TestAccAzureTs(t *testing.T) {
	checkExamples(t, "azure-ts", tests, getAzureBase)
}

func TestAccAzureCs(t *testing.T) {
	checkExamples(t, "azure-cs", tests, getAzureBase)
}

func TestAccAzureFs(t *testing.T) {
	checkExamples(t, "azure-fs", tests, getAzureBase)
}

func TestAccAzurePy(t *testing.T) {
	checkExamples(t, "azure-py", tests, getAzureBase)
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
