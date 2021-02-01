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

func TestAccAzureCsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["Endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureCsWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["IpAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureFsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-fs-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
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
				assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Hello, containers!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureGoAks(t *testing.T) {
	t.Skip("The credentials in ServicePrincipalProfile were invalid")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-aks"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["url"], func(body string) bool {
					return assert.Contains(t, body, "Hello Kubernetes bootcamp!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureGoAksMulticluster(t *testing.T) {
	skipIfShort(t)
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-aks-multicluster"),
			Config: map[string]string{
				"password":     "testTEST1234+_^$",
				"sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureGoAppservice(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureGoWebserverComponent(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-go-webserver-component"),
			Config: map[string]string{
				"username": "webmaster",
				"password": "Password1234!",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureJsWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-js-webserver"),
			Config: map[string]string{
				"username": "testuser",
				"password": "testTEST1234+-*/",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicIP"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyAks(t *testing.T) {
	t.Skip("The credentials in ServicePrincipalProfile were invalid")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-aks"),
			Config: map[string]string{
				"password": "testTEST1234+_^$",
				"sshkey":   "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
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
					return assert.Contains(t, body, "Greetings from Azure App Service!")
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
				assertAppServiceResult(t, stack.Outputs["hello_endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Hello, world!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyArmTemplate(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyHdInsightSpark(t *testing.T) {
	t.Skip("Skipping HDInsights tests due to a stuck cluster in the account")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-hdinsight-spark"),
			Config: map[string]string{
				"username": "testuser",
				"password": "MyPassword123+-*/",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzurePyVmScaleSet(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-py-vm-scaleset"),
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

func TestAccAzureTsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-appservice"),
			Config: map[string]string{
				"sqlPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertAppServiceResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
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
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-arm-template"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsFunctions(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure Functions!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsHdInsightSpark(t *testing.T) {
	t.Skip("Skipping HDInsights tests due to a stuck cluster in the account")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-hdinsight-spark"),
			Config: map[string]string{
				"username": "testuser",
				"password": "MyPassword123+-*/",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsStreamAnalytics(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-stream-analytics"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsVmScaleset(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-vm-scaleset"),
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

func TestAccAzureTsAksHelm(t *testing.T) {
	skipIfShort(t)
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-aks-helm"),
			Config: map[string]string{
				"password":     "testTEST1234+_^$",
				"sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["serviceIP"], nil, func(body string) bool {
					return assert.Contains(t, body, "It works!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsAksKeda(t *testing.T) {
	skipIfShort(t)
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-aks-keda"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsAksMulticluster(t *testing.T) {
	skipIfShort(t)
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-aks-multicluster"),
			Config: map[string]string{
				"password":     "testTEST1234+_^$",
				"sshPublicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsCosmosDbLogicApp(t *testing.T) {
	skipIfShort(t)
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-cosmosdb-logicapp"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureTsWebserverComponent(t *testing.T) {
	t.Skip("Skipping Azure tests temporarily")
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-ts-webserver-component"),
			Config: map[string]string{
				"username": "webmaster",
				"password": "MySuperS3cretPassw0rd",
			},
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
			"azure:environment": azureEnviron,
			"azure:location":    azureLocation,
		},
	})
	return azureBase
}
