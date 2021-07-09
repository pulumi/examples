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

type manyResourcesConfig struct {
	suffix       string
	resources    int
	payloadBytes int
}

func TestGoManyResources(t *testing.T) {
	folder := "go-many-resources"

	configurations := []manyResourcesConfig{
		{suffix: "-64-ALPHA-V1", resources: 64, payloadBytes: 1024},
		{suffix: "-128-ALPHA-V1", resources: 128, payloadBytes: 1024},
		{suffix: "-256-ALPHA-V1", resources: 256, payloadBytes: 1024},

		{suffix: "-64-ALPHA-V2", resources: 64, payloadBytes: 8},
		{suffix: "-128-ALPHA-V2", resources: 128, payloadBytes: 8},
		{suffix: "-256-ALPHA-V2", resources: 256, payloadBytes: 8},
		{suffix: "-512-ALPHA-V2", resources: 512, payloadBytes: 8},
		// {suffix: "-1024-ALPHA-V2", resources: 1024, payloadBytes: 8},
		// {suffix: "-2028-ALPHA-V2", resources: 2048, payloadBytes: 8},
		// {suffix: "-4096-ALPHA-V2", resources: 4096, payloadBytes: 8},
	}

	check := func(t *testing.T, cfg manyResourcesConfig) {
		benchmark := bench(fmt.Sprintf("%s%s", folder, cfg.suffix), "", "go", "go")
		opts := integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", folder),
			Env: []string{
				fmt.Sprintf("RESOURCE_COUNT=%d", cfg.resources),
				fmt.Sprintf("RESOURCE_PAYLOAD_BYTES=%d", cfg.payloadBytes),
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assert.Equal(t, len(stack.Outputs), cfg.resources)
				output1, gotOutput1 := stack.Outputs["output-1"]
				assert.True(t, gotOutput1)
				output1str, isStr := output1.(string)
				assert.True(t, isStr)
				if gotOutput1 && isStr {
					assert.Equal(t, cfg.payloadBytes, len(output1str))
				}
			},
		}
		test := getBaseOptions(t).With(opts).With(benchmark.ProgramTestOptions())
		integration.ProgramTest(t, &test)
	}

	for _, configuration := range configurations {
		t.Run(fmt.Sprintf("%s%s", folder, configuration.suffix), func(t *testing.T) {
			check(t, configuration)
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
