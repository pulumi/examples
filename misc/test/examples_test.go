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
	region := os.Getenv("AWS_REGION")
	if region == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
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
			Dir:       path.Join(cwd, "..", "..", "aws-js-webserver"),
			SkipBuild: true,
			Config: map[string]string{
				"aws:region": "us-west-2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				expectHelloWorld(t, stack.Outputs["publicHostName"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir:       path.Join(cwd, "..", "..", "aws-js-webserver-component"),
			SkipBuild: true,
			Config: map[string]string{
				"aws:region": "us-west-2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				expectHelloWorld(t, stack.Outputs["webUrl"])
			},
		}),
		base.With(integration.ProgramTestOptions{
			Dir:           path.Join(cwd, "..", "..", "aws-py-webserver"),
			Verbose:       true,
			DebugLogLevel: 8,
			DebugUpdates:  true,
			SkipBuild:     true,
			Config: map[string]string{
				"aws:region": "us-west-2",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				expectHelloWorld(t, stack.Outputs["public_dns"])
			},
		}),
	}

	for _, ex := range examples {
		example := ex
		t.Run(example.Dir, func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
}

func expectHelloWorld(t *testing.T, output interface{}) bool {
	host, ok := output.(string)
	if !assert.True(t, ok, fmt.Sprintf("expected `%s` output", output)) {
		return false
	}
	// Wait to ensure startup script has time to run
	time.Sleep(1 * time.Minute)
	hostname := host
	if !strings.HasPrefix(hostname, "http://") {
		hostname = fmt.Sprintf("http://%s", host)
	}
	resp, err := http.Get(hostname)
	if !assert.NoError(t, err) {
		return false
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if !assert.NoError(t, err) {
		return false
	}
	return assert.Equal(t, "Hello, World!\n", string(body))

}
