// +build Performance all

package test

import (
	"fmt"
	"io/ioutil"
	"log"
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
	name     string
	provider string
	runtime  string
	language string
}

func TestAccAwsGoS3Folder(t *testing.T) {
	benchmark := bench{"aws-go-s3-folder", "aws", "go", "go"}
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
	test := getAWSBase(t).With(opts).With(tracingOpts(t, benchmark))
	integration.ProgramTest(t, &test)
}

func TestAccAwsCsS3Folder(t *testing.T) {
	benchmark := bench{"aws-cs-s3-folder", "aws", "dotnet", "csharp"}
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
	test := getAWSBase(t).With(opts).With(tracingOpts(t, benchmark))
	integration.ProgramTest(t, &test)
}

func TestAccAwsFsS3Folder(t *testing.T) {
	benchmark := bench{"aws-fs-s3-folder", "aws", "dotnet", "fsharp"}
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
	test := getAWSBase(t).With(opts).With(tracingOpts(t, benchmark))
	integration.ProgramTest(t, &test)
}

func TestAccAwsJsS3Folder(t *testing.T) {
	benchmark := bench{"aws-js-s3-folder", "aws", "nodejs", "js"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(tracingOpts(t, benchmark))
	integration.ProgramTest(t, &test)
}

func TestAccAwsPyS3Folder(t *testing.T) {
	benchmark := bench{"aws-py-s3-folder", "aws", "python", "python"}
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(tracingOpts(t, benchmark))
	integration.ProgramTest(t, &test)
}

func TestMain(m *testing.M) {
	code := m.Run()

	dir := tracingDir()
	if dir != "" {
		// After all tests run with tracing, compute metrics
		// on the entire set.
		err := computeMetrics(dir)
		if err != nil {
			log.Fatal(err)
		}
	}

	os.Exit(code)
}

func tracingDir() string {
	return os.Getenv("PULUMI_TRACING_DIR")
}

func tracingOpts(t *testing.T, benchmark bench) integration.ProgramTestOptions {
	dir := tracingDir()

	if dir != "" {
		return integration.ProgramTestOptions{
			Env: []string{
				"PULUMI_TRACING_TAG_REPO=pulumi/examples",
				fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_NAME=%s", benchmark.name),
				fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_PROVIDER=%s", benchmark.provider),
				fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_RUNTIME=%s", benchmark.runtime),
				fmt.Sprintf("PULUMI_TRACING_TAG_BENCHMARK_LANGUAGE=%s", benchmark.language),
				"PULUMI_TRACING_MEMSTATS_POLL_INTERVAL=100ms",
			},
			Tracing: fmt.Sprintf("file:%s",
				filepath.Join(dir, fmt.Sprintf("%s-{command}.trace", benchmark.name))),
		}
	}

	return integration.ProgramTestOptions{}
}

func computeMetrics(dir string) error {
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
