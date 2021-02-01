// +build Cloud all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
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
			// TODO[pulumi/examples#859]: Currently this examples leads to a no-op preview diff of:
			// ++ aws:ecs:TaskDefinition ffmpegThumbTask create replacement [diff: ~containerDefinitions]
			// +- aws:ecs:TaskDefinition ffmpegThumbTask replace [diff: ~containerDefinitions]
			// ~  aws:lambda:Function onNewVideo update [diff: ~code]
			// ~  aws:s3:BucketNotification onNewVideo update [diff: ~lambdaFunctions]
			// -- aws:ecs:TaskDefinition ffmpegThumbTask delete original [diff: ~containerDefinitions]
			AllowEmptyPreviewChanges: true,
			AllowEmptyUpdateChanges:  true,
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
			// TODO[pulumi/examples#859]: Currently this examples leads to a no-op preview diff of:
			//  ++ aws:ecs:TaskDefinition ffmpegThumbTask create replacement [diff: ~containerDefinitions]
			//  +- aws:ecs:TaskDefinition ffmpegThumbTask replace [diff: ~containerDefinitions]
			//  ~  aws:lambda:Function AmazonRekognitionTopic_labelResults update [diff: ~code]
			//  ++ aws:sns:TopicSubscription AmazonRekognitionTopic_labelResults create replacement [diff: ~endpoint]
			//  +- aws:sns:TopicSubscription AmazonRekognitionTopic_labelResults replace [diff: ~endpoint]
			//  -- aws:sns:TopicSubscription AmazonRekognitionTopic_labelResults delete original [diff: ~endpoint]
			//  -- aws:ecs:TaskDefinition ffmpegThumbTask delete original [diff: ~containerDefinitions]
			AllowEmptyPreviewChanges: true,
			AllowEmptyUpdateChanges:  true,
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
	})
	return azureBase
}
