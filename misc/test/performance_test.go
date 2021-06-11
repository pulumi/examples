// +build Performance all

package test

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pulumi/pulumi-trace-tool/traces"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

type bench struct {
	name  string
	cloud string
	lang  string
}

func TestAccAwsGoS3Folder(t *testing.T) {
	benchmark := bench{"aws-go-s3-folder", "aws", "go"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["websiteUrl"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getBase(t, benchmark, opts)
	integration.ProgramTest(t, &test)
	computeMetricsInTest(t)
}

func TestAccAwsCsS3Folder(t *testing.T) {
	benchmark := bench{"aws-cs-s3-folder", "aws", "cs"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["Endpoint"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getBase(t, benchmark, opts)
	integration.ProgramTest(t, &test)
	computeMetricsInTest(t)
}

func TestAccAwsFsS3Folder(t *testing.T) {
	benchmark := bench{"aws-fs-s3-folder", "aws", "fs"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["endpoint"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getBase(t, benchmark, opts)
	integration.ProgramTest(t, &test)
	computeMetricsInTest(t)
}

func TestAccAwsJsS3Folder(t *testing.T) {
	benchmark := bench{"aws-js-s3-folder", "aws", "js"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getBase(t, benchmark, opts)
	integration.ProgramTest(t, &test)
	computeMetricsInTest(t)
}

func TestAccAwsPyS3Folder(t *testing.T) {
	benchmark := bench{"aws-py-s3-folder", "aws", "py"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getBase(t, benchmark, opts)
	integration.ProgramTest(t, &test)
	computeMetricsInTest(t)
}

func getBase(t *testing.T, benchmark bench, opts integration.ProgramTestOptions) integration.ProgramTestOptions {
	dir := os.Getenv("PULUMI_TRACING_DIR")

	if dir != "" {

		opts.Env = []string{
			"PULUMI_TRACING_TAG_REPO=pulumi/examples",
			fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_NAME=%s", benchmark.name),
			fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_CLOUD=%s", benchmark.cloud),
			fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_LANGUAGE=%s", benchmark.lang),
			"PULUMI_TRACING_MEMSTATS_POLL_INTERVAL=100ms",
		}

		opts.Tracing = fmt.Sprintf("file:%s",
			filepath.Join(dir, fmt.Sprintf("%s-{command}.trace", benchmark.name)))
	}

	return getAWSBase(t).With(opts)
}

func computeMetricsInTest(t *testing.T) {
	err := computeMetrics()
	if err != nil {
		t.Fatal(err)
	}
}

func computeMetrics() error {
	dir := os.Getenv("PULUMI_TRACING_DIR")
	if dir == "" {
		return nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return err
	}

	defer os.Chdir(cwd)

	err = os.Chdir(dir)
	if err != nil {
		return err
	}

	files, err := ioutil.ReadDir(".")
	if err != nil {
		return err
	}

	var traceFiles []string
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".trace") {
			traceFiles = append(traceFiles, f.Name())
		}
	}

	if err := traces.ToCsv(traceFiles, "traces.csv", "filename"); err != nil {
		return err
	}

	f, err := os.Create("metrics.csv")
	if err != nil {
		return err
	}

	if err := traces.Metrics("traces.csv", "filename", f); err != nil {
		return err
	}

	return nil
}
