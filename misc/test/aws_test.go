//go:build Aws || all
// +build Aws all

package test

import (
	"encoding/base64"
	"fmt"
	"path"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/stretchr/testify/assert"
)

func TestAccAwsGoAssumeRole(t *testing.T) {
	nanos := time.Now().UnixNano()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-assume-role", "create-role"),
			Config: map[string]string{
				"aws-go-create-role:unprivilegedUsername": fmt.Sprintf("unpriv-go-%d", nanos),
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoEks(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-eks"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello Kubernetes bootcamp!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoFargate(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-fargate"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoS3FolderComponent(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-s3-folder-component"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["websiteUrl"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, world!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoWebserver(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["publicIp"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsCsAssumeRole(t *testing.T) {
	nanos := time.Now().UnixNano()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-cs-assume-role", "create-role"),
			Config: map[string]string{
				"aws-cs-create-role:unprivilegedUsername": fmt.Sprintf("unpriv-cs-%d", nanos),
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsContainers(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-containers"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsS3FolderComponent(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-s3-folder-component"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["websiteUrl"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsSqsSlack(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-sqs-slack"),
			Config: map[string]string{
				"slackToken": "token",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsWebserver(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["publicHostName"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsJsWebserverComponent(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-js-webserver-component"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPHelloWorld(t, stack.Outputs["webUrl"], nil)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsApiGatewayPyRoutes(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-apigateway-py-routes"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint+"lambda", nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, API Gateway!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsApiGatewayTsRoutes(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-apigateway-ts-routes"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint+"lambda", nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, API Gateway!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyAppSync(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-appsync"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoAppSync(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-appsync"),
			// TODO[pulumi/examples#1118]: Fix issue with extra runtime validation
			// ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			// 	maxWait := 8 * time.Minute

			// 	endpoint := stack.Outputs["endpoint"].(string)
			// 	mutation := "mutation AddTenant { addTenant(id: \"123\", name: \"FirstCorp\") { id name } }"

			// 	finalURL := fmt.Sprintf("%s?query=%s", endpoint, url.QueryEscape(mutation))

			// 	key := stack.Outputs["key"].(string)
			// 	headersMap := map[string]string{
			// 		"Content-Type": "application/graphql",
			// 		"x-api-key":    key,
			// 	}

			// 	assertHTTPResultShapeWithRetry(t, finalURL, headersMap, maxWait, func(body string) bool {
			// 		return !strings.Contains(body, "AccessDeniedException")
			// 	}, func(body string) bool {
			// 		return assert.Contains(t, body, "FirstCorp")
			// 	})
			// },
		})
	integration.ProgramTest(t, &test)
}

func TestAccAwsPyAssumeRole(t *testing.T) {
	nanos := time.Now().UnixNano()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-assume-role", "create-role"),
			Config: map[string]string{
				"aws-py-create-role:unprivilegedUsername": fmt.Sprintf("unpriv-py-%d", nanos),
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyResources(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-resources"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsGoResources(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-go-resources"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyStepFunctions(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-stepfunctions"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsPyWebserver(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-py-webserver"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, "http://"+stack.Outputs["public_dns"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Hello, World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAirflow(t *testing.T) {
	t.Skip("Skip as this example no longer works: 'Unable to satisfy 100% MinSuccessfulInstancesPercent requirement.'")
	// https://github.com/pulumi/examples/issues/1346
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-airflow"),
			Config: map[string]string{
				"airflow:dbPassword": "secretP4ssword",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsApiGateway(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-apigateway"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["endpoint"].(string)
				assertHTTPResultWithRetry(t, endpoint+"hello", nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "route")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAppSync(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-appsync"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsAssumeRole(t *testing.T) {
	nanos := time.Now().UnixNano()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-assume-role", "create-role"),
			Config: map[string]string{
				"aws-ts-create-role:unprivilegedUsername": fmt.Sprintf("unpriv-%d", nanos),
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsContainers(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-containers"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 15 * time.Minute
				endpoint := stack.Outputs["frontendURL"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEc2Provisioners(t *testing.T) {
	checkAccAwsEc2Provisioners(t, "aws-ts-ec2-provisioners")
}

func TestAccAwsPyEc2Provisioners(t *testing.T) {
	checkAccAwsEc2Provisioners(t, "aws-py-ec2-provisioners")
}

func checkAccAwsEc2Provisioners(t *testing.T, dir string) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(getAwsRegion())},
	)
	assert.NoError(t, err)
	svc := ec2.New(sess)
	keyName, err := resource.NewUniqueHex("test-keyname", 8, 20)
	assert.NoError(t, err)
	t.Logf("Creating keypair %s.\n", keyName)
	key, err := svc.CreateKeyPair(&ec2.CreateKeyPairInput{
		KeyName: aws.String(keyName),
	})
	assert.NoError(t, err)
	if err != nil {
		return
	}
	defer func() {
		t.Logf("Deleting keypair %s.\n", keyName)
		_, err := svc.DeleteKeyPair(&ec2.DeleteKeyPairInput{
			KeyName: aws.String(keyName),
		})
		assert.NoError(t, err)
	}()
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", dir),
			Config: map[string]string{
				"keyName": aws.StringValue(key.KeyName),
			},
			Secrets: map[string]string{
				"privateKey": base64.StdEncoding.EncodeToString([]byte(aws.StringValue(key.KeyMaterial))),
			},
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				catConfigStdout := stack.Outputs["catConfigStdout"]
				assert.NotEmpty(t, catConfigStdout)
			},
		})
	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEks(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-eks"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsNextjs(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-nextjs"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsEksHelloWorld(t *testing.T) {
	t.Skip("Skip due to frequent failures: `timeout while waiting for state to become 'ACTIVE'`")
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-eks-hello-world"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["serviceHostname"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsHelloFargate(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-hello-fargate"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				maxWait := 10 * time.Minute
				endpoint := stack.Outputs["url"].(string)
				assertHTTPResultWithRetry(t, endpoint, nil, maxWait, func(body string) bool {
					return assert.Contains(t, body, "Hello World!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsPulumiWebhooks(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-pulumi-webhooks"),
			Config: map[string]string{
				"cloud:provider":                      "aws",
				"aws-ts-pulumi-webhooks:slackChannel": "general",
				"aws-ts-pulumi-webhooks:slackWebhook": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsPulumiMiniflux(t *testing.T) {
	t.Skip("Skip until ECS Service supports custom timeouts")
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-pulumi-miniflux"),
			Config: map[string]string{
				"aws-ts-pulumi-miniflux:db_name":        "miniflux",
				"aws-ts-pulumi-miniflux:db_username":    "minifluxuser",
				"aws-ts-pulumi-miniflux:db_password":    "2Password2",
				"aws-ts-pulumi-miniflux:admin_username": "adminuser",
				"aws-ts-pulumi-miniflux:admin_password": "2Password2",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsResources(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-resources"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsS3LambdaCopyZip(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-s3-lambda-copyzip"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsSlackbot(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-slackbot"),
			Config: map[string]string{
				"mentionbot:slackToken":        "XXX",
				"mentionbot:verificationToken": "YYY",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsStepFunctions(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-stepfunctions"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsThumbnailer(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-thumbnailer"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsLambdaThumbnailer(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-lambda-thumbnailer"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsTwitterAthena(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-twitter-athena"),
			Config: map[string]string{
				"aws-ts-twitter-athena:twitterConsumerKey":       "12345",
				"aws-ts-twitter-athena:twitterConsumerSecret":    "xyz",
				"aws-ts-twitter-athena:twitterAccessTokenKey":    "12345",
				"aws-ts-twitter-athena:twitterAccessTokenSecret": "xyz",
				"aws-ts-twitter-athena:twitterQuery":             "smurfs",
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsTsLambdaEfs(t *testing.T) {
	test := getAWSBase(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "aws-ts-lambda-efs"),
		})

	integration.ProgramTest(t, &test)
}
