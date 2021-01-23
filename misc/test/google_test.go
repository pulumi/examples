// +build google all

package test

import (
	"fmt"
	"os"
	"path"
	"testing"
	"time"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccGcpGoFunctions(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-go-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["function"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpGoFunctionsRaw(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-go-functions-raw"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["function"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpGoGke(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-go-gke"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello Kubernetes bootcamp!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpGoInstance(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-go-instance"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpGoWebserver(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-go-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpJsWebserver(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-js-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["instanceIP"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyFunctions(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["fxn_url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Space Needle, Seattle, WA")
				})
			},
			// TODO[pulumi/examples#859]: Currently this examples leads to a no-op preview diff of:
			//  -- gcp:storage:BucketObject eta_demo_object delete original
			//  +- gcp:storage:BucketObject eta_demo_object replace [diff: ~name]
			//  ++ gcp:storage:BucketObject eta_demo_object create replacement [diff: ~name]
			//  ~  gcp:cloudfunctions:Function eta_demo_function update [diff: ~sourceArchiveObject]
			AllowEmptyPreviewChanges: true,
			AllowEmptyUpdateChanges:  true,
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyServerlessRaw(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-serverless-raw"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["go_endpoint"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
				assertHTTPResult(t, stack.Outputs["python_endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpPyInstanceNginx(t *testing.T) {
	t.Skip("Skip due to frequent failures: `35.239.87.214:80: connect: connection refused`")
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-py-instance-nginx"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["external_ip"].(string)
				maxWait := time.Minute * 10
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Test Page for the Nginx HTTP Server on Fedora")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsFunctions(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-ts-functions"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Greetings from Google Cloud Functions!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsServerlessRaw(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "gcp-ts-serverless-raw"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["goEndpoint"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
				assertHTTPResult(t, stack.Outputs["pythonEndpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccGcpTsCloudRun(t *testing.T) {
	test := getGoogleBase(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getCwd(t), "..", "..", "gcp-ts-cloudrun"),
			RunUpdateTest: false,
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := stack.Outputs["rubyUrl"].(string)
				assertHTTPResult(t, endpoint, nil, func(body string) bool {
					return assert.Contains(t, body, "Hello Pulumi!")
				})
			},
			// TODO[pulumi/examples#859]: Currently this examples leads to a no-op preview diff of:
			// ~  gcp:cloudrun:Service ruby update [diff: ~template]
			AllowEmptyPreviewChanges: true,
			AllowEmptyUpdateChanges:  true,
		})

	integration.ProgramTest(t, &test)
}

func getGoogleProject() string {
	project := os.Getenv("GOOGLE_PROJECT")
	if project == "" {
		project = "pulumi-ci-gcp-provider"
		fmt.Println("Defaulting GOOGLE_PROJECT to 'pulumi-ci-gcp-provider'.  You can override using the GOOGLE_PROJECT variable")
	}

	return project
}

func getGoogleZone() string {
	zone := os.Getenv("GOOGLE_ZONE")
	if zone == "" {
		zone = "us-central1-a"
		fmt.Println("Defaulting GOOGLE_ZONE to 'us-central1-a'.  You can override using the GOOGLE_ZONE variable")
	}

	return zone
}

func getGkeVersion() string {
	gkeEngineVersion := os.Getenv("GKE_ENGINE_VERSION")
	if gkeEngineVersion == "" {
		gkeEngineVersion = "1.13.7-gke.24"
		fmt.Println("Defaulting GKE_ENGINE_VERSION to '1.13.7-gke.24'. You can override using the GKE_ENGINE_VERSION variable")
	}

	return gkeEngineVersion
}

func getGoogleBase(t *testing.T) integration.ProgramTestOptions {
	googleZone := getGoogleZone()
	googleProject := getGoogleProject()
	base := getBaseOptions(t)
	gkeBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"gcp:project": googleProject,
			"gcp:zone":    googleZone,
		},
	})
	return gkeBase
}
