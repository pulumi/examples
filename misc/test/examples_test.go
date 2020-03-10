// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

package test

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pulumi/pulumi/pkg/resource"
	"github.com/pulumi/pulumi/pkg/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccAwsJsContainers(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-containers"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsS3Folder(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-s3-folder"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsS3FolderComponent(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-s3-folder-component"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsSqsSlack(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-sqs-slack"),
			Config: map[string]string{
				"slackToken": "token",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsWebserver(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicHostName"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsWebserverComponent(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-webserver-component"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["webUrl"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyAppSync(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-appsync"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyResources(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-resources"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyS3Folder(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-s3-folder"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyStepFunctions(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-stepfunctions"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyWebserver(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["public_dns"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAirflow(t *testing.T) {
	t.Skip("Skip due to failures initializing 20(!) instances")
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-airflow"),
			Config: map[string]string{
				"airflow:dbPassword": "secretP4ssword",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsApiGateway(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-apigateway"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["endpoint"].(string)
				assertHTTPResultWithRetry(t, endpoint+"hello", nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "route")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAppSync(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-appsync"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAssumeRole(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-assume-role", "create-role"),
			Config: map[string]string{
				"create-role:unprivilegedUsername": "unpriv",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsContainers(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-containers"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 15 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEc2Provisioners(t *testing.T) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(getAwsRegion())},
	)
	assert.NoError(t, err)
	svc := ec2.New(sess)
	keyName, err := resource.NewUniqueHex("test-keyname", 8, 20)
	assert.NoError(t, err)
	t.Logf("Creating keypair %s.\n", keyName)
	key, err := svc.CreateKeyPair(&ec2.CreateKeyPairInput{
		KeyName: aws.String(keyName),
	})
	assert.NoError(t, err)
	defer func() {
		t.Logf("Deleting keypair %s.\n", keyName)
		_, err := svc.DeleteKeyPair(&ec2.DeleteKeyPairInput{
			KeyName: aws.String(keyName),
		})
		assert.NoError(t, err)
	}()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-ec2-provisioners"),
			Config: map[string]string{
				"keyName": aws.StringValue(key.KeyName),
			},
			Secrets: map[string]string{
				"privateKey": base64.StdEncoding.EncodeToString([]byte(aws.StringValue(key.KeyMaterial))),
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				catConfigStdout := stack.Outputs["catConfigStdout"].(string)
				assert.Equal(t, "[test]\nx = 42\n", catConfigStdout)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEks(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-eks"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEksHelloWorld(t *testing.T) {
	t.Skip("Skip due to frequent failures: `timeout while waiting for state to become 'ACTIVE'`")
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-eks-hello-world"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["serviceHostname"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsHelloFargate(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-hello-fargate"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsPulumiWebhooks(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-pulumi-webhooks"),
			Config: map[string]string{
				"cloud:provider":                      "aws",
				"aws-ts-pulumi-webhooks:slackChannel": "general",
				"aws-ts-pulumi-webhooks:slackToken":   "12345",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsPulumiMiniflux(t *testing.T) {
	t.Skip("Skip until ECS Service supports custom timeouts")
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-pulumi-miniflux"),
			Config: map[string]string{
				"aws-ts-pulumi-miniflux:db_name":        "miniflux",
				"aws-ts-pulumi-miniflux:db_username":    "minifluxuser",
				"aws-ts-pulumi-miniflux:db_password":    "2Password2",
				"aws-ts-pulumi-miniflux:admin_username": "adminuser",
				"aws-ts-pulumi-miniflux:admin_password": "2Password2",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsResources(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-resources"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsS3LambdaCopyZip(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-s3-lambda-copyzip"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsSlackbot(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-slackbot"),
			Config: map[string]string{
				"mentionbot:slackToken":        "XXX",
				"mentionbot:verificationToken": "YYY",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsStepFunctions(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-stepfunctions"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsThumbnailer(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-thumbnailer"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsTwitterAthena(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-twitter-athena"),
			Config: map[string]string{
				"aws-ts-twitter-athena:twitterConsumerKey":       "12345",
				"aws-ts-twitter-athena:twitterConsumerSecret":    "xyz",
				"aws-ts-twitter-athena:twitterAccessTokenKey":    "12345",
				"aws-ts-twitter-athena:twitterAccessTokenSecret": "xyz",
				"aws-ts-twitter-athena:twitterQuery":             "smurfs",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAzureCsAppService(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-appservice"),
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

func TestAccAzureCsWebserver(t *testing.T) {
	test := getAzureBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "azure-cs-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ipAddress"].(string), nil, func(body string) bool {
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
				"azure-web:username": "testuser",
				"azure-web:password": "testTEST1234+-*/",
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

func TestAccCloudJsApi(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-api"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"hello\",\"count\":1}")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsContainers(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-containers"),
			Config: map[string]string{
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["hostname"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsHttpServer(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-httpserver"),
			Config: map[string]string{
				"cloud:provider": "aws",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"/hello\",\"count\":1}")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsThumbnailer(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-thumbnailer"),
			Config: map[string]string{
				"cloud-aws:useFargate": "true",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsThumbnailerMachineLearning(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-thumbnailer-machine-learning"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"cloud-aws:useFargate": "true",
				"cloud-aws:computeIAMRolePolicyARNs": "arn:aws:iam::aws:policy/AWSLambdaFullAccess,arn:aws:iam::aws:" +
					"policy/AmazonEC2ContainerServiceFullAccess,arn:aws:iam::aws:policy/AmazonRekognitionFullAccess",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsUrlShortener(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-url-shortener"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsUrlShortenerCache(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-url-shortener-cache"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsVotingApp(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-voting-app"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["frontendURL"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Pulumi Voting App")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanPyK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-py-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ingress_ip"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanPyLoadbalancedDroplets(t *testing.T) {
	t.Skip("Skip due to 'Error waiting for Load Balancer' failures")
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-py-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanTsK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-ts-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ingressIp"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanTsLoadbalancedDroplets(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-ts-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanCsK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-cs-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ingressIp"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanCsLoadbalancedDroplets(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-cs-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccLinodeJsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "linode-js-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpJsWebserver(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-js-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyFunctions(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["fxn_url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Space Needle, Seattle, WA")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyServerlessRaw(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-serverless-raw"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["go_endpoint"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
				assertHTTPResult(t, stack.Outputs["python_endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyInstanceNginx(t *testing.T) {
	t.Skip("Skip due to frequent failures: `35.239.87.214:80: connect: connection refused`")
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-instance-nginx"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["external_ip"].(string)
				maxWait := time.Minute * 10
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Test Page for the Nginx HTTP Server on Fedora")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsFunctions(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-ts-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Google Cloud Functions!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsServerlessRaw(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-ts-serverless-raw"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["goEndpoint"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
				assertHTTPResult(t, stack.Outputs["pythonEndpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsCloudRun(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getCwd(t), "..", "..", "gcp-ts-cloudrun"),
			RunUpdateTest: false,
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["rubyUrl"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccPacketPyWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "packet-py-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccPacketTsWebserver(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "packet-ts-webserver"),
		})

	integration.ProgramTest(t, &test)
}

func skipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping long-running test in short mode")
	}
}

func getAwsRegion() string {
	awsRegion := os.Getenv("AWS_REGION")
	if awsRegion == "" {
		awsRegion = "us-west-1"
		fmt.Println("Defaulting AWS_REGION to 'us-west-1'.  You can override using the AWS_REGION environment variable")
	}

	return awsRegion
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

func getGoogleProject() string {
	project := os.Getenv("GOOGLE_PROJECT")
	if project == "" {
		project = "pulumi-ci-gcp-provider"
		fmt.Println("Defaulting GOOGLE_PROJECT to 'pulumi-ci-gcp-provider'.  You can override using the GOOGLE_PROJECT variable")
	}

	return project
}

func getGoogleZone() string {
	zone := os.Getenv("GOOGLE_ZONE")
	if zone == "" {
		zone = "us-central1-a"
		fmt.Println("Defaulting GOOGLE_ZONE to 'us-central1-a'.  You can override using the GOOGLE_ZONE variable")
	}

	return zone
}

func getGkeVersion() string {
	gkeEngineVersion := os.Getenv("GKE_ENGINE_VERSION")
	if gkeEngineVersion == "" {
		gkeEngineVersion = "1.13.7-gke.24"
		fmt.Println("Defaulting GKE_ENGINE_VERSION to '1.13.7-gke.24'. You can override using the GKE_ENGINE_VERSION variable")
	}

	return gkeEngineVersion
}

func getCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

func getBaseOptions(t *testing.T) integration.ProgramTestOptions {
	overrides, err := integration.DecodeMapString(os.Getenv("PULUMI_TEST_NODE_OVERRIDES"))
	if err != nil {
		t.FailNow()
	}

	base := integration.ProgramTestOptions{
		Tracing:              "https://tracing.pulumi-engineering.com/collector/api/v1/spans",
		ExpectRefreshChanges: true,
		Overrides:            overrides,
		Quick:                true,
		SkipRefresh:          true,
		RetryFailedSteps:     true,
	}

	return base
}

func getAWSBase(t *testing.T) integration.ProgramTestOptions {
	awsRegion := getAwsRegion()
	base := getBaseOptions(t)
	awsBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": awsRegion,
		},
	})
	return awsBase
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

func getGoogleBase(t *testing.T) integration.ProgramTestOptions {
	googleZone := getGoogleZone()
	googleProject := getGoogleProject()
	base := getBaseOptions(t)
	gkeBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"gcp:project": googleProject,
			"gcp:zone":    googleZone,
		},
	})
	return gkeBase
}

func getCloudBase(t *testing.T) integration.ProgramTestOptions {
	awsRegion := getAwsRegion()
	base := getBaseOptions(t)
	azureBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": awsRegion,
		},
	})
	return azureBase
}

func assertHTTPResult(t *testing.T, output interface{}, headers map[string]string, check func(string) bool) bool {
	return assertHTTPResultWithRetry(t, output, headers, 5*time.Minute, check)
}

func assertHTTPResultWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration, check func(string) bool) bool {
	return assertHTTPResultShapeWithRetry(t, output, headers, maxWait, func(string) bool { return true }, check)
}

func assertAppServiceResult(t *testing.T, output interface{}, check func(string) bool) bool {
	ready := func(body string) bool {
		// We got a welcome page from Azure App Service. This means the resource is deployed but our custom code is not
		// there yet. Wait a bit more and retry later.
		welcomePage := strings.Contains(body, "Your app service is up and running.")
		return !welcomePage
	}
	return assertHTTPResultShapeWithRetry(t, output, nil, 5*time.Minute, ready, check)
}

func assertHTTPResultShapeWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration,
	ready func(string) bool, check func(string) bool) bool {
	hostname, ok := output.(string)
	if !assert.True(t, ok, fmt.Sprintf("expected `%s` output", output)) {
		return false
	}

	if !(strings.HasPrefix(hostname, "http://") || strings.HasPrefix(hostname, "https://")) {
		hostname = fmt.Sprintf("http://%s", hostname)
	}

	startTime := time.Now()
	count, sleep := 0, 0
	for true {
		now := time.Now()
		req, err := http.NewRequest("GET", hostname, nil)
		if !assert.NoError(t, err) {
			return false
		}

		for k, v := range headers {
			// Host header cannot be set via req.Header.Set(), and must be set
			// directly.
			if strings.ToLower(k) == "host" {
				req.Host = v
				continue
			}
			req.Header.Set(k, v)
		}

		client := &http.Client{Timeout: time.Second * 10}
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == 200 {
			if !assert.NotNil(t, resp.Body, "resp.body was nil") {
				return false
			}

			// Read the body
			defer resp.Body.Close()
			body, err := ioutil.ReadAll(resp.Body)
			if !assert.NoError(t, err) {
				return false
			}

			bodyText := string(body)

			// Even if we got 200 and a response, it may not be ready for assertion yet - that's specific per test.
			if ready(bodyText) {
				// Verify it matches expectations
				return check(bodyText)
			}
		}
		if now.Sub(startTime) >= maxWait {
			fmt.Printf("Timeout after %v. Unable to http.get %v successfully.", maxWait, hostname)
			return false
		}
		count++
		// delay 10s, 20s, then 30s and stay at 30s
		if sleep > 30 {
			sleep = 30
		} else {
			sleep += 10
		}
		time.Sleep(time.Duration(sleep) * time.Second)
		fmt.Printf("Http Error: %v\n", err)
		fmt.Printf("  Retry: %v, elapsed wait: %v, max wait %v\n", count, now.Sub(startTime), maxWait)
	}

	return false
}

func assertHTTPHelloWorld(t *testing.T, output interface{}, headers map[string]string) bool {
	return assertHTTPResult(t, output, headers, func(s string) bool {
		return assert.Equal(t, "Hello, World!\n", s)
	})
}
