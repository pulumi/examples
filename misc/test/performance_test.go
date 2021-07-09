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
	folder       string
	bench        traces.Benchmark
	resources    int
	payloadBytes int
}

func TestGoManyResources(t *testing.T) {
	var configurations []manyResourcesConfig

	for _, resources := range []int{64, 128, 256} {
		confs := []manyResourcesConfig{
			{
				folder:       "go-many-resources",
				bench:        bench(fmt.Sprintf("go-many-resources-%d", resources), "", "go", "go"),
				resources:    resources,
				payloadBytes: 8,
			},
			{
				folder:       "cs-many-resources",
				bench:        bench(fmt.Sprintf("cs-many-resources-%d", resources), "", "dotnet", "csharp"),
				resources:    resources,
				payloadBytes: 8,
			},
			{
				folder:       "ts-many-resources",
				bench:        bench(fmt.Sprintf("ts-many-resources-%d", resources), "", "nodejs", "typescript"),
				resources:    resources,
				payloadBytes: 8,
			},
			{
				folder:       "py-many-resources",
				bench:        bench(fmt.Sprintf("py-many-resources-%d", resources), "", "python", "python"),
				resources:    resources,
				payloadBytes: 8,
			},
		}
		configurations = append(configurations, confs...)
	}

	check := func(t *testing.T, cfg manyResourcesConfig) {
		opts := integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", cfg.folder),
			Env: []string{
				fmt.Sprintf("RESOURCE_COUNT=%d", cfg.resources),
				fmt.Sprintf("RESOURCE_PAYLOAD_BYTES=%d", cfg.payloadBytes),
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assert.Equal(t, float64(cfg.resources), stack.Outputs["ResourceCount"])
				assert.Equal(t, float64(cfg.payloadBytes), stack.Outputs["ResourcePayloadBytes"])
			},
		}
		test := getBaseOptions(t).With(opts).With(cfg.bench.ProgramTestOptions())
		integration.ProgramTest(t, &test)
	}

	for _, cfg := range configurations {
		t.Run(cfg.bench.Name, func(t *testing.T) {
			check(t, cfg)
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
