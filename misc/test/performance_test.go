//go:build Performance || all
// +build Performance all

package test

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi-trace-tool/traces"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
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
	dir := path.Join(getCwd(t), "..", "..", benchmark.Name)

	// Update AWS to latest.
	cmd := exec.Command("go", "get", "-u", "github.com/pulumi/pulumi-aws/sdk/v6")
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	require.NoErrorf(t, err, "Failed to update pulumi-aws to latest version: %s", out)
	t.Logf("Updated pulumi-aws dependency to the latest version")

	opts := integration.ProgramTestOptions{
		Dir: dir,
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["websiteUrl"].(string)
			helpers.AssertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestAccAwsCsS3Folder(t *testing.T) {
	benchmark := bench("aws-cs-s3-folder", "aws", "dotnet", "csharp")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["Endpoint"].(string)
			helpers.AssertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestAccAwsFsS3Folder(t *testing.T) {
	benchmark := bench("aws-fs-s3-folder", "aws", "dotnet", "fsharp")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			maxWait := 10 * time.Minute
			endpoint := stack.Outputs["endpoint"].(string)
			helpers.AssertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
				return assert.Contains(t, body, "Hello, world!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestAccAwsJsS3Folder(t *testing.T) {
	benchmark := bench("aws-js-s3-folder", "aws", "nodejs", "js")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			helpers.AssertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestAccAwsTsS3Folder(t *testing.T) {
	benchmark := bench("aws-ts-s3-folder", "aws", "nodejs", "ts")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			helpers.AssertHTTPResult(t, "http://"+stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestAccAwsPyS3Folder(t *testing.T) {
	benchmark := bench("aws-py-s3-folder", "aws", "python", "python")
	opts := integration.ProgramTestOptions{
		Dir: path.Join(getCwd(t), "..", "..", benchmark.Name),
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			helpers.AssertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

func TestPolicyPacks(t *testing.T) {
	policyPack := path.Join(getCwd(t), "..", "benchmarks", "policy-slow")

	// Install the dependencies for the policy pack first
	npmInstallCmd := exec.Command("npm", "install")
	npmInstallCmd.Dir = policyPack
	err := npmInstallCmd.Run()
	assert.NoError(t, err)

	benchmark := bench("policy-test", "aws", "go", "go")
	opts := integration.ProgramTestOptions{
		Dir:                    path.Join(getCwd(t), "..", "..", "aws-go-s3-folder"),
		UpdateCommandlineFlags: []string{fmt.Sprintf("--policy-pack=%s", policyPack)},
		ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			helpers.AssertHTTPResult(t, "http://"+stack.Outputs["website_url"].(string), nil, func(body string) bool {
				return assert.Contains(t, body, "Hello, Pulumi!")
			})
		},
	}
	test := getAWSBase(t).With(opts)
	programTestAsBenchmark(t, benchmark, test)
}

type manyResourcesConfig struct {
	folder       string
	bench        traces.Benchmark
	resources    int
	payloadBytes int
}

func TestManyResources(t *testing.T) {
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
			Dir: path.Join(getCwd(t), "..", "benchmarks", cfg.folder),
			Config: map[string]string{
				"resource_count":         fmt.Sprintf("%d", cfg.resources),
				"resource_payload_bytes": fmt.Sprintf("%d", cfg.payloadBytes),
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assert.Equal(t, float64(cfg.resources), stack.Outputs["ResourceCount"])
				assert.Equal(t, float64(cfg.payloadBytes), stack.Outputs["ResourcePayloadBytes"])
			},
		}
		test := getBaseOptions(t).With(opts)
		programTestAsBenchmark(t, cfg.bench, test)
	}

	for _, cfg := range configurations {
		t.Run(cfg.bench.Name, func(t *testing.T) {
			check(t, cfg)
		})
	}
}

func programTestAsBenchmark(
	t *testing.T,
	bench traces.Benchmark,
	test integration.ProgramTestOptions,
) {
	// Run preview only to make sure all needed plugins are
	// downloaded so that these downloads do not skew
	// measurements.
	t.Run("prewarm", func(t *testing.T) {
		prewarmOptions := test.With(integration.ProgramTestOptions{
			RequireService:           true,
			SkipRefresh:              true,
			SkipEmptyPreviewUpdate:   true,
			SkipExportImport:         true,
			SkipUpdate:               true,
			AllowEmptyPreviewChanges: true,
			AllowEmptyUpdateChanges:  true,
			NoParallel:               true,
		})
		prewarmOptions.ExtraRuntimeValidation = nil
		integration.ProgramTest(t, &prewarmOptions)
	})

	// Run with --tracing to record measured data.
	t.Run("benchmark", func(t *testing.T) {
		finalOptions := test.With(bench.ProgramTestOptions()).With(integration.ProgramTestOptions{
			RequireService: true,
			NoParallel:     true,
		})
		integration.ProgramTest(t, &finalOptions)
	})

	// Run again against filestate backend; rename the benchmark first so that in the data
	// warehouse one can distinguish easily the filestate time series from the regular ones that
	// utilize the service backend.
	t.Run("benchmark-filestate", func(t *testing.T) {
		renamedBench := bench
		renamedBench.Name += "-filestate"
		finalOptions := test.With(renamedBench.ProgramTestOptions()).With(integration.ProgramTestOptions{
			RequireService: false, // use filestate instead
			NoParallel:     true,
		})
		integration.ProgramTest(t, &finalOptions)
	})
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
