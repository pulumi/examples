// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package examples

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestS3Website(t *testing.T) {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	test := integration.ProgramTestOptions{
		Dir:         path.Join(cwd, "program"),
		Quick:       true,
		SkipRefresh: true,
		Config: map[string]string{
			"aws:region": "us-west-1",
		},
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	integration.ProgramTest(t, &test)
}

func assertHTTPResult(t *testing.T, output interface{}, headers map[string]string, check func(string) bool) bool {
	return assertHTTPResultWithRetry(t, output, headers, 5*time.Minute, check)
}

func assertHTTPResultWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration, check func(string) bool) bool {
	return assertHTTPResultShapeWithRetry(t, output, headers, maxWait, func(string) bool { return true }, check)
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
	for {
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
