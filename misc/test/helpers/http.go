package helpers

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func AssertHTTPResult(t *testing.T, output interface{}, headers map[string]string, check func(string) bool) bool {
	return AssertHTTPResultWithRetry(t, output, headers, 5*time.Minute, check)
}

func AssertHTTPResultWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration, check func(string) bool) bool {
	return AssertHTTPResultShapeWithRetry(t, output, headers, maxWait, func(string) bool { return true }, check)
}

func AssertHTTPResultShapeWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration,
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
	// Why the most recent attempt did not satisfy the check. A transport error, a
	// non-200 status and a body that `ready` rejected are distinct failure modes,
	// and the last one seen is the only useful thing to report if we run out of
	// time, so keep it rather than reporting a bare "no successful GET".
	lastFailure := "no request was attempted"
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
		switch {
		case err != nil:
			lastFailure = fmt.Sprintf("transport error: %v", err)
		case resp.StatusCode != 200:
			lastFailure = fmt.Sprintf("unexpected status: %v", resp.Status)
		default:
			if !assert.NotNil(t, resp.Body, "resp.body was nil") {
				return false
			}

			// Read the body
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			if !assert.NoError(t, err) {
				return false
			}

			bodyText := string(body)

			// Even if we got 200 and a response, it may not be ready for assertion yet - that's specific per test.
			if ready(bodyText) {
				// Verify it matches expectations
				return check(bodyText)
			}
			lastFailure = "got 200 but the body was not ready for assertion yet"
		}
		if now.Sub(startTime) >= maxWait {
			// No caller reads the returned bool, so the test only fails if we fail
			// it here. Returning false alone lets a never-successful check pass.
			assert.Failf(t, "HTTP check never succeeded",
				"Timeout after %v. Unable to http.get %v successfully after %v attempts. Last failure: %s",
				maxWait, hostname, count+1, lastFailure)
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
		fmt.Printf("Http Error: %v\n", lastFailure)
		fmt.Printf("  Retry: %v, elapsed wait: %v, max wait %v\n", count, now.Sub(startTime), maxWait)
	}
}

func AssertHTTPHelloWorld(t *testing.T, output interface{}, headers map[string]string) bool {
	return AssertHTTPResult(t, output, headers, func(s string) bool {
		return assert.Equal(t, "Hello, World!\n", s)
	})
}
