package helpers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

// AssertHTTPResultShapeWithRetry used to print and return false when it ran out of
// time without ever marking the test failed. No caller reads the returned bool, so
// an endpoint that never came up still reported PASS. maxWait of 0 makes the first
// attempt also the last one, so these cases finish immediately.
func TestAssertHTTPResultFailsTestOnTimeout(t *testing.T) {
	unreachable := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {}))
	url := unreachable.URL
	unreachable.Close() // nothing is listening on this port any more

	serverErr := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "boom", http.StatusInternalServerError)
		}))
	defer serverErr.Close()

	notReady := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte("still starting up"))
		}))
	defer notReady.Close()

	always := func(string) bool { return true }
	never := func(string) bool { return false }

	tests := []struct {
		name   string
		url    string
		ready  func(string) bool
		expect string
	}{
		{"transport error", url, always, "transport error"},
		{"non-200 status", serverErr.URL, always, "unexpected status"},
		{"body never ready", notReady.URL, never, "not ready for assertion"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spy := &testing.T{}
			ok := AssertHTTPResultShapeWithRetry(spy, tt.url, nil, 0, tt.ready,
				func(string) bool { return true })

			assert.False(t, ok, "helper should report failure")
			assert.True(t, spy.Failed(), "helper must fail the test it was given")
		})
	}
}

// The success path must stay non-failing.
func TestAssertHTTPResultPassesOnSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte("Hello, World!\n"))
		}))
	defer server.Close()

	spy := &testing.T{}
	ok := AssertHTTPHelloWorld(spy, server.URL, nil)

	assert.True(t, ok)
	assert.False(t, spy.Failed())
}
