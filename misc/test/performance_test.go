// +build Performance all

package test

import (
	"fmt"
	"log"
	"os"
	"path"
	"testing"
	"time"

	"github.com/pulumi/pulumi-trace-tool/traces"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func bench(name, provider, runtime, lang string) traces.Benchmark {
	b := traces.NewBenchmark(name)
	b.Provider = provider
	b.Runtime = runtime
	b.Language = lang
	b.Repository = "pulumi/examples"
	return b
}

func TestAccAwsGoS3Folder(t *testing.T) {
	benchmark := bench("aws-go-s3-folder", "aws", "go", "go")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["websiteUrl"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(benchmark.ProgramTestOptions())
	integration.ProgramTest(t, &test)
}

func TestAccAwsCsS3Folder(t *testing.T) {
	benchmark := bench("aws-cs-s3-folder", "aws", "dotnet", "csharp")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["Endpoint"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(benchmark.ProgramTestOptions())
	integration.ProgramTest(t, &test)
}

func TestAccAwsFsS3Folder(t *testing.T) {
	benchmark := bench("aws-fs-s3-folder", "aws", "dotnet", "fsharp")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["endpoint"].(string)
			assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(benchmark.ProgramTestOptions())
	integration.ProgramTest(t, &test)
}

func TestAccAwsJsS3Folder(t *testing.T) {
	benchmark := bench("aws-js-s3-folder", "aws", "nodejs", "js")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(benchmark.ProgramTestOptions())
	integration.ProgramTest(t, &test)
}

func TestAccAwsPyS3Folder(t *testing.T) {
	benchmark := bench("aws-py-s3-folder", "aws", "python", "python")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			assertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts).With(benchmark.ProgramTestOptions())
	integration.ProgramTest(t, &test)
}

func TestGoManyResources(t *testing.T) {
	check := func(t *testing.T, resourceCount int) {
		folder := "go-many-resources"
		benchmark := bench(fmt.Sprintf("%s-%d-ALPHA-V1", folder, resourceCount), "", "go", "go")
		opts := integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", folder),
			Env: []string{fmt.Sprintf("RESOURCE_COUNT=%d", resourceCount)},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assert.Equal(t, len(stack.Outputs), resourceCount)
				output1, gotOutput1 := stack.Outputs["output-1"]
				assert.True(t, gotOutput1)
				output1str, isStr := output1.(string)
				assert.True(t, isStr)
				if gotOutput1 && isStr {
					assert.Equal(t, 1024, len(output1str))
				}
			},
		}
		test := getBaseOptions(t).With(opts).With(benchmark.ProgramTestOptions())
		integration.ProgramTest(t, &test)
	}

	for _, resourceCount := range []int{64, 128, 256} {
		t.Run(fmt.Sprintf("with-%d-resources", resourceCount), func(t *testing.T) {
			check(t, resourceCount)
		})
	}
}

func TestMain(m *testing.M) {
	code := m.Run()

	// If tracing is enabled, after all tests run with tracing,
	// compute metrics on the entire set.
	err := traces.ComputeMetrics()
	if err != nil {
		log.Fatal(err)
	}

	os.Exit(code)
}
