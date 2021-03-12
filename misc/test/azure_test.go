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
	defTest("azure-cs-aci").skip(),
	defTest("azure-cs-aks").skip(),

	defTest("azure-cs-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("Endpoint", "Greetings from Azure App Service"),

	defTest("azure-cs-appservice-docker").skip(),
	defTest("azure-cs-cosmosdb-logicapp").skip(),
	defTest("azure-cs-credential-rotation-one-set").skip(),
	defTest("azure-cs-functions").skip(),
	defTest("azure-cs-net5-aks-webapp").skip(),
	defTest("azure-cs-static-website").skip(),
	defTest("azure-cs-synapse").skip(),

	defTest("azure-go-aci").
		checkAppService("endpoint", "Hello, containers!"),

	defTest("azure-go-aks").skip(),
	defTest("azure-go-appservice-docker").skip(),
	defTest("azure-go-static-website").skip(),
	defTest("azure-py-aci").skip(),
	defTest("azure-py-aks").skip(),

	defTest("azure-py-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("azure-py-appservice-docker").
		checkAppService("helloEndpoint", "Hello, world!"),

	defTest("azure-py-cosmosdb-logicapp").skip(),
	defTest("azure-py-minecraft-server").skip(),
	defTest("azure-py-static-website").skip(),
	defTest("azure-py-synapse").skip(),
	defTest("azure-py-virtual-data-center").skip(),

	defTest("azure-py-webserver").
		conf("username", "testuser").
		conf("password", "testTEST1234+-*/").
		checkHttp("public_ip", "Hello, World!"),

	defTest("azure-ts-aci").skip(),
	defTest("azure-ts-aks").skip(),
	defTest("azure-ts-aks-helm").skip(),

	defTest("azure-ts-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("azure-ts-appservice-docker").
		checkAppService("getStartedEndpoint", "Azure App Service"),

	defTest("azure-ts-cosmosdb-logicapp").skip(),

	defTest("azure-ts-functions").
		checkHttp("endpoint", "Hello from Node.js, Pulumi"),

	defTest("azure-ts-functions-many").skip(),
	defTest("azure-ts-static-website").skip(),
	defTest("azure-ts-synapse").skip(),
	defTest("azure-ts-webapp-privateendpoint-vnet-injection").skip(),

	defTest("azure-ts-webserver").
		conf("username", "webmaster").
		conf("password", "MySuperS3cretPassw0rd").
		checkHttp("ipAddress", "Hello, World"),

	defTest("classic-azure-cs-botservice").skip(),
	defTest("classic-azure-cs-cosmosapp-component").skip(),
	defTest("classic-azure-cs-msi-keyvault-rbac").skip(),
	defTest("classic-azure-cs-vm-scaleset").skip(),

	defTest("classic-azure-cs-webserver").
		checkHttp("IpAddress", "Hello, World"),

	defTest("classic-azure-fs-aci").skip(),
	defTest("classic-azure-fs-aks").skip(),

	defTest("classic-azure-fs-appservice").
		conf("sqlPassword", "2@Password@2").
		checkAppService("endpoint", "Greetings from Azure App Service"),

	defTest("classic-azure-go-aks-multicluster").skip(),

	defTest("classic-azure-go-webserver-component").
		conf("username", "webmaster").
		conf("password", "Password1234!"),

	defTest("classic-azure-py-aks-multicluster").skip(),

	defTest("classic-azure-py-arm-template"),

	defTest("classic-azure-py-hdinsight-spark").skip(),
	defTest("classic-azure-py-msi-keyvault-rbac").skip(),

	defTest("classic-azure-py-vm-scaleset").
		checkHttp("public_address", "nginx"),

	defTest("classic-azure-py-webserver-component").skip(),
	defTest("classic-azure-ts-aks-helm").skip(),
	defTest("classic-azure-ts-aks-keda").skip(),
	defTest("classic-azure-ts-aks-mean").skip(),
	defTest("classic-azure-ts-aks-multicluster").skip(),
	defTest("classic-azure-ts-aks-with-diagnostics").skip(),
	defTest("classic-azure-ts-api-management").skip(),
	defTest("classic-azure-ts-appservice-devops").skip(),
	defTest("classic-azure-ts-appservice-springboot").skip(),

	defTest("classic-azure-ts-arm-template"),

	defTest("classic-azure-ts-cosmosapp-component").skip(),
	defTest("classic-azure-ts-dynamicresource").skip(),
	defTest("classic-azure-ts-hdinsight-spark").skip(),
	defTest("classic-azure-ts-msi-keyvault-rbac").skip(),
	defTest("classic-azure-ts-serverless-url-shortener-global").skip(),

	defTest("classic-azure-ts-stream-analytics"),

	defTest("classic-azure-ts-vm-provisioners").skip(),

	defTest("classic-azure-ts-vm-scaleset").
		checkHttp("publicAddress", "nginx"),

	defTest("classic-azure-ts-webserver-component").skip(),
}

// Table-drivent test entry points.
//
// Note TestAccAzure$LANG pattern is used by GitHub Actions to run
// specific checks. For example we may be called with:
//
//     go test .. --run-TestAccAzurePy

func TestAccAzureJs(t *testing.T) {
	checkExamples(t, "azure_test.go", "azure-js", tests, getAzureBase)
}

func TestAccAzureTs(t *testing.T) {
	checkExamples(t, "azure_test.go", "azure-ts", tests, getAzureBase)
}

func TestAccAzureCs(t *testing.T) {
	checkExamples(t, "azure_test.go", "azure-cs", tests, getAzureBase)
}

func TestAccAzureFs(t *testing.T) {
	checkExamples(t, "azure_test.go", "azure-fs", tests, getAzureBase)
}

func TestAccAzurePy(t *testing.T) {
	checkExamples(t, "azure_test.go", "azure-py", tests, getAzureBase)
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
