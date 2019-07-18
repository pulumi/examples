// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

package test

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pulumi/pulumi/pkg/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestExamples(t *testing.T) {
	awsRegion := os.Getenv("AWS_REGION")
	if awsRegion == "" {
		awsRegion = "us-west-1"
		fmt.Println("Defaulting AWS_REGION to 'us-west-1'.  You can override using the AWS_REGION environment variable")
	}
	azureEnviron := os.Getenv("ARM_ENVIRONMENT")
	if azureEnviron == "" {
		azureEnviron = "public"
		fmt.Println("Defaulting ARM_ENVIRONMENT to 'public'.  You can override using the ARM_ENVIRONMENT variable")
	}
	azureLocation := os.Getenv("ARM_LOCATION")
	if azureLocation == "" {
		azureLocation = "westus"
		fmt.Println("Defaulting ARM_LOCATION to 'westus'.  You can override using the ARM_LOCATION variable")
	}
	cwd, err := os.Getwd()
	if !assert.NoError(t, err, "expected a valid working directory: %v", err) {
		return
	}
	overrides, err := integration.DecodeMapString(os.Getenv("PULUMI_TEST_NODE_OVERRIDES"))
	if !assert.NoError(t, err, "expected valid override map: %v", err) {
		return
	}

	base := integration.ProgramTestOptions{
		Tracing:              "https://tracing.pulumi-engineering.com/collector/api/v1/spans",
		ExpectRefreshChanges: true,
		Overrides:            overrides,
		Quick:                true,
		SkipRefresh:          true,
	}

	shortTests := []integration.ProgramTestOptions{
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-containers"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-s3-folder"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-s3-folder-component"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-sqs-slack"),
			Config: map[string]string{
				"aws:region": awsRegion,
				"slackToken": "token",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-webserver"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicHostName"], nil)
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-webserver-component"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["webUrl"], nil)
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-py-s3-folder"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-py-stepfunctions"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-py-webserver"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["public_dns"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-airflow"),
			Config: map[string]string{
				"aws:region":         awsRegion,
				"airflow:dbPassword": "secretP4ssword",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-apigateway"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["endpoint"].(string)
				assertHTTPResultWithRetry(t, endpoint+"hello", nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "route")
				})
			},
		}),

		// aws-ts-apigateway-auth0 requires manual interaction with auth0

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-appsync"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-assume-role", "create-role"),
			Config: map[string]string{
				"aws:region":                       awsRegion,
				"create-role:unprivilegedUsername": "unpriv",
			},
		}),

		// aws-ts-assume-role/assume-role requires output of aws-ts-assume-role/create-role

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-containers"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 15 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-eks"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-eks-hello-world"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["serviceHostname"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-hello-fargate"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-pulumi-webhooks"),
			Config: map[string]string{
				"cloud:provider":                      "aws",
				"aws:region":                          awsRegion,
				"aws-ts-pulumi-webhooks:slackChannel": "general",
				"aws-ts-pulumi-webhooks:slackToken":   "12345",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-resources"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-ruby-on-rails"),
			Config: map[string]string{
				"aws:region":     awsRegion,
				"dbUser":         "testUser",
				"dbPassword":     "2@Password@2",
				"dbRootPassword": "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				// Due to setup time on the vm this output does not show up for several minutes so
				// increase wait time a bit
				maxWait := 20 * time.Minute
				assertHTTPResultWithRetry(t, stack.Outputs["websiteURL"], nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "New Note")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-s3-lambda-copyzip"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),

		// aws-ts-serverless-raw requires dotnet installed and a command ran pre-testing

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-slackbot"),
			Config: map[string]string{
				"aws:region":                   awsRegion,
				"mentionbot:slackToken":        "XXX",
				"mentionbot:verificationToken": "YYY",
			},
		}),

		// aws-ts-stackreference is an intermingled example that requires inputs from other stacks
		// aws-ts-static-website needs reworked to include a ACM cert

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-stepfunctions"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-thumbnailer"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-ts-twitter-athena"),
			Config: map[string]string{
				"aws:region": awsRegion,
				"aws-ts-twitter-athena:twitterConsumerKey":       "12345",
				"aws-ts-twitter-athena:twitterConsumerSecret":    "xyz",
				"aws-ts-twitter-athena:twitterAccessTokenKey":    "12345",
				"aws-ts-twitter-athena:twitterAccessTokenSecret": "xyz",
				"aws-ts-twitter-athena:twitterQuery":             "smurfs",
			},
		}),
		//// Test disabled due to flakiness (often times out when destroying)
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "aws-ts-url-shortener-cache-http"),
		//	Config: map[string]string{
		//		"aws:region":    awsRegion,
		//		"redisPassword": "s3cr7Password",
		//	},
		//}),
		// Test disabled due to flakiness (often times out when destroying)
		//// https://github.com/pulumi/examples/issues/260
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "aws-ts-voting-app"),
		//	Config: map[string]string{
		//		"aws:region":    awsRegion,
		//		"redisPassword": "s3cr7Password",
		//	},
		//}),

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-js-webserver"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"username":          "testuser",
				"password":          "testTEST1234+-*/",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicIP"], nil)
			},
		}),

		// azure-py-aks

		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-py-webserver"),
		//	Config: map[string]string{
		//		"azure:environment":  azureEnviron,
		//		"azure-web:username": "testuser",
		//		"azure-web:password": "testTEST1234+-*/",
		//	},
		//	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		//		assertHTTPHelloWorld(t, stack.Outputs["publicIP"])
		//	},
		//}),

		// azure-ts-aks-helm
		// azure-ts-aks-mean
		// azure-ts-aks-multicluster

		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-api-management"),
		//	Config: map[string]string{
		//		"azure:environment": azureEnviron,
		//	},
		//	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		//		assertHTTPResult(t, stack.Outputs["endpoint"].(string), func(body string) bool {
		//			return assert.Contains(t, body, "Hello Pulumi!")
		//		})
		//	},
		//}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-appservice"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"sqlPassword":       "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
				})
			},
		}),

		// azure-ts-appservice-devops

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-appservice-docker"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["getStartedEndpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Azure App Service")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-arm-template"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
			},
		}),
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-dynamicresource"),
		//	Config: map[string]string{
		//		"azure:environment": azureEnviron,
		//	},
		//}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-functions"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"azure:location":    azureLocation,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure Functions!")
				})
			},
		}),

		// azure-ts-functions-raw require specific language setups for tests

		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-hdinsight-spark"),
		//	Config: map[string]string{
		//		"azure:location": azureLocation,
		//		"username":       "testuser",
		//		"password":       "MyPassword123+-*/",
		//	},
		//}),

		// azure-ts-msi-keyvault-rbac requires DotNet setup

		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-serverless-url-shortener-global"),
		//	Config: map[string]string{
		//		"locations": "westus,eastus,westeurope",
		//	},
		//}),
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-static-website"),
		//	Config: map[string]string{
		//		"azure:location": azureLocation,
		//	},
		//	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		//		maxWait := 15 * time.Minute
		//		assertHTTPResultWithRetry(t, stack.Outputs["cdnEndpoint"], maxWait, func(body string) bool {
		//			return assert.Contains(t, body, "This file is served from Blob Storage")
		//		})
		//	},
		//}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-stream-analytics"),
			Config: map[string]string{
				"azure:location": azureLocation,
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-webserver"),
			Config: map[string]string{
				"azure:location": azureLocation,
				"username":       "webmaster",
				"password":       "MySuperS3cretPassw0rd",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ipAddress"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-webserver-component"),
			Config: map[string]string{
				"azure:location": azureLocation,
				"username":       "webmaster",
				"password":       "MySuperS3cretPassw0rd",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-api"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"hello\",\"count\":1}")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-containers"),
			Config: map[string]string{
				"aws:region":           awsRegion,
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["hostname"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-httpserver"),
			Config: map[string]string{
				"cloud:provider": "aws",
				"aws:region":     awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"/hello\",\"count\":1}")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-thumbnailer"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"aws:region":           awsRegion,
				"cloud-aws:useFargate": "true",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-thumbnailer-machine-learning"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"aws:region":           awsRegion,
				"cloud-aws:useFargate": "true",
				"cloud-aws:computeIAMRolePolicyARNs": "arn:aws:iam::aws:policy/AWSLambdaFullAccess,arn:aws:iam::aws:" +
					"policy/AmazonEC2ContainerServiceFullAccess,arn:aws:iam::aws:policy/AmazonRekognitionFullAccess",
			},
		}),

		// cloud-js-twitter-athena

		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-ts-url-shortener"),
			Config: map[string]string{
				"aws:region":           awsRegion,
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-ts-url-shortener-cache"),
			Config: map[string]string{
				"aws:region":           awsRegion,
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		}),
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "cloud-ts-url-shortener-cache-http"),
		//	Config: map[string]string{
		//		"aws:region":                     awsRegion,
		//		"redisPassword":                  "s3cr7Password",
		//		"cloud:provider":                 "aws",
		//		"cloud-aws:useFargate":           "true",
		//		"cloud-aws:functionIncludePaths": "",
		//	},
		//	// TODO: This test is not returning a valid payload see issue: https://github.com/pulumi/examples/issues/155
		//	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		//		assertHTTPResult(t, stack.Outputs["endpointUrl"], nil, func(body string) bool {
		//			return assert.Contains(t, body, "<title>Short URL Manager</title>")
		//		})
		//	},
		//}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-ts-voting-app"),
			Config: map[string]string{
				"aws:region":           awsRegion,
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["frontendURL"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Pulumi Voting App")
				})
			},
		}),

		base.With(integration.ProgramTestOptions{
			Dir:    path.Join(cwd, "..", "..", "digitalocean-ts-loadbalanced-droplets"),
			Config: map[string]string{},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		}),

		base.With(integration.ProgramTestOptions{
			Dir:    path.Join(cwd, "..", "..", "linode-js-webserver"),
			Config: map[string]string{},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-js-webserver"),
			Config: map[string]string{
				"gcp:project": "pulumi-ci-gcp-provider",
				"gcp:zone":    "us-central1-a",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-py-functions"),
			Config: map[string]string{
				"gcp:project": "pulumi-ci-gcp-provider",
				"gcp:zone":    "us-central1-a",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-py-gke"),
			Config: map[string]string{
				"gcp:project":       "pulumi-ci-gcp-provider",
				"gcp:zone":          "us-central1-a",
				"password":          "S4cretPassword!",
				"node_count":        "3",
				"node_machine_type": "n1-standard-2",
			},
		}),
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "gcp-py-instance-nginx"),
		//	Config: map[string]string{
		//		"gcp:project": "pulumi-ci-gcp-provider",
		//		"gcp:zone": "us-central1-a",
		//	},
		//	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		//		endpoint := stack.Outputs["external_ip"].(string)
		//		assertHTTPResult(t, endpoint, nil, func(body string) bool {
		//			return assert.Contains(t, body, "Test Page for the Nginx HTTP Server on Fedora")
		//		})
		//	},
		//}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-ts-functions"),
			Config: map[string]string{
				"gcp:project": "pulumi-ci-gcp-provider",
				"gcp:zone":    "us-central1-a",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Google Cloud Functions!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-ts-gke"),
			Config: map[string]string{
				"gcp:project":     "pulumi-ci-gcp-provider",
				"gcp:zone":        "us-central1-a",
				"password":        "S4cretPassword123!",
				"nodeCount":       "3",
				"nodeMachineType": "n1-standard-2",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-ts-gke-hello-world"),
			Config: map[string]string{
				"gcp:project": "pulumi-ci-gcp-provider",
				"gcp:zone":    "us-central1-a",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["servicePublicIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx")
				})
			},
		}),
		// gcp-ts-k8s-ruby-on-rails-postgresql we need to think about what we do with dockerhub password
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "gcp-ts-serverless-raw"),
			Config: map[string]string{
				"gcp:project": "pulumi-ci-gcp-provider",
				"gcp:zone":    "us-central1-a",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["goEndpoint"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		}),
		//base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "gcp-ts-slackbot"),
		//	Config: map[string]string{
		//		"gcp:project": "pulumi-ci-gcp-provider",
		//		"gcp:zone": "us-central1-a",
		//	},
		//}),
	}

	longTests := []integration.ProgramTestOptions{
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-aks-helm"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"password":          "testTEST1234+_^$",
				"sshPublicKey":      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["serviceIP"], nil, func(body string) bool {
					return assert.Contains(t, body, "It works!")
				})
			},
		}),
		// TODO: This test fails due to a bug in the Terraform Azure provider in which the
		// service principal is not available when attempting to create the K8s cluster.
		// See the azure-ts-aks-multicluster readme for more detail and
		// https://github.com/terraform-providers/terraform-provider-azurerm/issues/1635.
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-aks-multicluster"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"password":          "testTEST1234+_^$",
				"sshPublicKey":      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
			},
		}),
	}

	tests := shortTests
	if !testing.Short() {
		tests = append(tests, longTests...)
	}

	for _, ex := range tests {
		example := ex
		t.Run(filepath.Base(example.Dir), func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
}

func assertHTTPResult(t *testing.T, output interface{}, headers map[string]string, check func(string) bool) bool {
	return assertHTTPResultWithRetry(t, output, headers, 5*time.Minute, check)
}

func assertHTTPResultWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration, check func(string) bool) bool {
	hostname, ok := output.(string)
	if !assert.True(t, ok, fmt.Sprintf("expected `%s` output", output)) {
		return false
	}
	if !(strings.HasPrefix(hostname, "http://") || strings.HasPrefix(hostname, "https://")) {
		hostname = fmt.Sprintf("http://%s", hostname)
	}

	var err error
	var resp *http.Response
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
		resp, err = client.Do(req)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if now.Sub(startTime) >= maxWait {
			fmt.Printf("Timeout after %v. Unable to http.get %v successfully.", maxWait, hostname)
			break
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
	if !assert.NoError(t, err) {
		return false
	}
	// Read the body
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if !assert.NoError(t, err) {
		return false
	}
	// Verify it matches expectations
	return check(string(body))
}

func assertHTTPHelloWorld(t *testing.T, output interface{}, headers map[string]string) bool {
	return assertHTTPResult(t, output, headers, func(s string) bool {
		return assert.Equal(t, "Hello, World!\n", s)
	})
}
