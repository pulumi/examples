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
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	azureEnviron := os.Getenv("ARM_ENVIRONMENT")
	if azureEnviron == "" {
		t.Skipf("Skipping test due to missing ARM_ENVIRONMENT variable")
	}
	cwd, err := os.Getwd()
	if !assert.NoError(t, err, "expected a valid working directory: %v", err) {
		return
	}

	base := integration.ProgramTestOptions{
		Tracing: "https://tracing.pulumi-engineering.com/collector/api/v1/spans",
	}

	examples := []integration.ProgramTestOptions{
		base.With(integration.ProgramTestOptions{
			Dir:       path.Join(cwd, "..", "..", "aws-js-s3-folder"),
			SkipBuild: true,
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
			Dir:       path.Join(cwd, "..", "..", "aws-js-s3-folder-component"),
			SkipBuild: true,
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
			Dir:       path.Join(cwd, "..", "..", "aws-js-webserver"),
			SkipBuild: true,
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicHostName"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir:       path.Join(cwd, "..", "..", "aws-js-webserver-component"),
			SkipBuild: true,
			Config: map[string]string{
				"aws:region": awsRegion,
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["webUrl"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir:       path.Join(cwd, "..", "..", "azure-js-webserver"),
			SkipBuild: true,
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
			Dir:       path.Join(cwd, "..", "..", "azure-ts-functions"),
			SkipBuild: true,
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
			Dir:           path.Join(cwd, "..", "..", "azure-ts-aks-helm"),
			Verbose:       true,
			DebugLogLevel: 8,
			DebugUpdates:  true,
			SkipBuild:     true,
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
		// TODO[pulumi/pulumi#1606] This test is failing in CI, disabling until this issue is resolved.
		// base.With(integration.ProgramTestOptions{
		// 	Dir:           path.Join(cwd, "..", "..", "aws-py-webserver"),
		// 	Verbose:       true,
		// 	DebugLogLevel: 8,
		// 	DebugUpdates:  true,
		// 	SkipBuild:     true,
		// 	Config: map[string]string{
		// 		"aws:region": awsRegion,
		// 	},
		// 	ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		// 		expectHelloWorld(t, stack.Outputs["public_dns"])
		// 	},
		// }),
	}

	for _, ex := range examples {
		example := ex
		t.Run(example.Dir, func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
}

func assertHTTPResult(t *testing.T, output interface{}, check func(string) bool) bool {
	hostname, ok := output.(string)
	if !assert.True(t, ok, fmt.Sprintf("expected `%s` output", output)) {
		return false
	}
	if !(strings.HasPrefix(hostname, "http://") || strings.HasPrefix(hostname, "https://")) {
		hostname = fmt.Sprintf("http://%s", hostname)
	}
	// GET the HTTP endpoint, retying up to 3 times.
	var err error
	var resp *http.Response
	for i := 0; i < 3; i++ {
		time.Sleep(time.Duration(i) * time.Minute)
		resp, err = http.Get(hostname)
		if err == nil {
			break
		}
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
