// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

package test

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
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
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-sqs-slack"),
			Config: map[string]string{
				"aws:region": awsRegion,
				"slackToken": "token",
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-s3-folder"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), func(body string) bool {
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
				assertHTTPResult(t, stack.Outputs["websiteUrl"].(string), func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-webserver"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicHostName"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "aws-js-webserver-component"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["webUrl"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-js-webserver"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"username":          "testuser",
				"password":          "testTEST1234+-*/",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicIP"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-functions"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure Functions!")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "azure-ts-appservice"),
			Config: map[string]string{
				"azure:environment": azureEnviron,
				"sqlPassword":       "2@Password@2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"], func(body string) bool {
					return assert.Contains(t, body, "Greetings from Azure App Service!")
				})
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
				assertHTTPResultWithRetry(t, endpoint+"hello", maxWait, func(body string) bool {
					return assert.Contains(t, body, "route")
				})
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
				maxWait := 10 * time.Minute
				assertHTTPResultWithRetry(t, stack.Outputs["websiteURL"], maxWait, func(body string) bool {
					return assert.Contains(t, body, "New Note")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-api"),
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"hello\",\"count\":1}")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-js-containers"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"aws:region":           "us-west-2",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["hostname"], func(body string) bool {
					return assert.Contains(t, body, "<p>Hello, containers!</p>")
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
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"/hello\",\"count\":1}")
				})
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "..", "..", "cloud-ts-url-shortener-cache-http"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"aws:region":           "us-west-2",
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			// TODO: This test is not returning a valid payload see issue: https://github.com/pulumi/examples/issues/155
			// ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			// 	assertHTTPResult(t, stack.Outputs["endpointUrl"], func(body string) bool {
			// 		return assert.Contains(t, body, "<title>Short URL Manager</title>")
			// 	})
			// },
		}),
		// TODO: This test fails due to a bug in the Terraform Azure provider in which the
		// service principal is not available when attempting to create the K8s cluster.
		// See the azure-ts-aks-example readme for more detail.
		// base.With(integration.ProgramTestOptions{
		// 	Dir:       path.Join(cwd, "..", "..", "azure-ts-aks-mean"),
		// 	Config: map[string]string{
		// 		"azure:environment": azureEnviron,
		// 		"password":          "testTEST1234+_^$",
		// 		"sshPublicKey":      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
		// 	},
		// 	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		// 		assertHTTPResult(t, stack.Outputs["endpoint"], func(body string) bool {
		// 			return assert.Contains(t, body, "<title>Node/Angular Todo App</title>>")
		// 		})
		// 	},
		// }),
		// TODO[pulumi/pulumi#1606] This test is failing in CI, disabling until this issue is resolved.
		// base.With(integration.ProgramTestOptions{
		// 	Dir:           path.Join(cwd, "..", "..", "aws-py-webserver"),
		// 	Verbose:       true,
		// 	DebugLogLevel: 8,
		// 	DebugUpdates:  true,
		// 	Config: map[string]string{
		// 		"aws:region": awsRegion,
		// 	},
		// 	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		// 		assertHTTPHelloWorld(t, stack.Outputs["public_dns"])
		// 	},
		// }),
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
				assertHTTPResult(t, stack.Outputs["serviceIP"], func(body string) bool {
					return assert.Contains(t, body, "It works!")
				})
			},
		}),
		// TODO: This test fails due to a bug in the Terraform Azure provider in which the
		// service principal is not available when attempting to create the K8s cluster.
		// See the azure-ts-aks-multicluster readme for more detail and
		// https://github.com/terraform-providers/terraform-provider-azurerm/issues/1635.
		// base.With(integration.ProgramTestOptions{
		//	Dir: path.Join(cwd, "..", "..", "azure-ts-aks-multicluster"),
		//	Config: map[string]string{
		//		"azure:environment": azureEnviron,
		//		"password":          "testTEST1234+_^$",
		//		"sshPublicKey":      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDeREOgHTUgPT00PTr7iQF9JwZQ4QF1VeaLk2nHKRvWYOCiky6hDtzhmLM0k0Ib9Y7cwFbhObR+8yZpCgfSX3Hc3w2I1n6lXFpMfzr+wdbpx97N4fc1EHGUr9qT3UM1COqN6e/BEosQcMVaXSCpjqL1jeNaRDAnAS2Y3q1MFeXAvj9rwq8EHTqqAc1hW9Lq4SjSiA98STil5dGw6DWRhNtf6zs4UBy8UipKsmuXtclR0gKnoEP83ahMJOpCIjuknPZhb+HsiNjFWf+Os9U6kaS5vGrbXC8nggrVE57ow88pLCBL+3mBk1vBg6bJuLBCp2WTqRzDMhSDQ3AcWqkucGqf dremy@remthinkpad",
		//	},
		// }),
	}

	tests := shortTests
	if !testing.Short() {
		tests = append(longTests...)
	}

	for _, ex := range tests {
		example := ex
		t.Run(example.Dir, func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
}

func assertHTTPResult(t *testing.T, output interface{}, check func(string) bool) bool {
	return assertHTTPResultWithRetry(t, output, 5*time.Minute, check)
}

func assertHTTPResultWithRetry(t *testing.T, output interface{}, maxWait time.Duration, check func(string) bool) bool {
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
		resp, err = http.Get(hostname)
		if err == nil {
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

func assertHTTPHelloWorld(t *testing.T, output interface{}) bool {
	return assertHTTPResult(t, output, func(s string) bool {
		return assert.Equal(t, "Hello, World!\n", s)
	})
}
