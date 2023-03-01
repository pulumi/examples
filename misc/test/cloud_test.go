//go:build Cloud || all
// +build Cloud all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccCloudJsApi(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-api"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"hello\",\"count\":1}")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsContainers(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-containers"),
			Config: map[string]string{
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["hostname"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsHttpServer(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-httpserver"),
			Config: map[string]string{
				"cloud:provider": "aws",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string)+"/hello", nil, func(body string) bool {
					return assert.Contains(t, body, "{\"route\":\"/hello\",\"count\":1}")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsThumbnailer(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-thumbnailer"),
			Config: map[string]string{
				"cloud-aws:useFargate": "true",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudJsThumbnailerMachineLearning(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-js-thumbnailer-machine-learning"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"cloud-aws:useFargate": "true",
				"cloud-aws:computeIAMRolePolicyARNs": "arn:aws:iam::aws:policy/AWSLambda_FullAccess," +
					"arn:aws:iam::aws:policy/AWSLambdaExecute," +
					"arn:aws:iam::aws:policy/AmazonECS_FullAccess," +
					"arn:aws:iam::aws:policy/AmazonRekognitionFullAccess," +
					"arn:aws:iam::aws:policy/IAMFullAccess",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsUrlShortener(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-url-shortener"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsUrlShortenerCache(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-url-shortener-cache"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpointUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Short URL Manager")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccCloudTsVotingApp(t *testing.T) {
	test := getCloudBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "cloud-ts-voting-app"),
			Config: map[string]string{
				// use us-west-2 to assure fargate
				"redisPassword":        "s3cr7Password",
				"cloud:provider":       "aws",
				"cloud-aws:useFargate": "true",
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["frontendURL"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Pulumi Voting App")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func getCloudBase(t *testing.T) integration.ProgramTestOptions {
	awsRegion := getAwsRegion()
	base := getBaseOptions(t)
	azureBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": awsRegion,
		},
		AllowEmptyPreviewChanges: true,
		AllowEmptyUpdateChanges:  true,
	})
	return azureBase
}
