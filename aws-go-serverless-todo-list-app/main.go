package main

import (
	"io/ioutil"
	"mime"
	"path"
	"path/filepath"

	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/apigatewayv2"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/dynamodb"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lambda"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a DynamoDB Table
		table, err := dynamodb.NewTable(ctx, "dynamodb", &dynamodb.TableArgs{
			Attributes: dynamodb.TableAttributeArray{
				&dynamodb.TableAttributeArgs{
					Name: pulumi.String("id"),
					Type: pulumi.String("S"),
				},
			},
			BillingMode: pulumi.String("PAY_PER_REQUEST"),
			HashKey:     pulumi.String("id"),
		})
		if err != nil {
			return err
		}

		// Create a IAM Managed Policy
		policy, err := iam.NewPolicy(ctx, "iam-pilicy", &iam.PolicyArgs{
			Description: pulumi.String("To-Do handler policy"),
			Path:        pulumi.String("/"),
			Policy: pulumi.Sprintf(`{
							"Version": "2012-10-17",
							"Statement": [
								{
									"Sid": "CreateAndPutLogs",
									"Action": [
										"logs:CreateLogGroup",
										"logs:CreateLogStream",
										"logs:PutLogEvents"
									],
									"Effect": "Allow",
									"Resource": "*"
								},
								{
									"Sid": "HandleDynamoDB",
									"Action": [
										"dynamodb:DeleteItem",
										"dynamodb:GetItem",
										"dynamodb:PutItem",
										"dynamodb:Scan"
									],
									"Effect": "Allow",
									"Resource": "%s"
								}
							]
						}`, table.Arn),
		})

		// Create an IAM role
		role, err := iam.NewRole(ctx, "iam-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Sid": "AllowToAssumeRole",
					"Effect": "Allow",
					"Principal": {
						"Service": "lambda.amazonaws.com"
					},
					"Action": "sts:AssumeRole"
				}]
			}`),
			ManagedPolicyArns: pulumi.StringArray{
				policy.Arn,
			},
		})
		if err != nil {
			return err
		}

		// Create a Lambda Function
		function, err := lambda.NewFunction(ctx, "lambda-function", &lambda.FunctionArgs{
			Code:        pulumi.NewFileArchive("handler/handler.zip"),
			Description: pulumi.String("To-Do handler"),
			Environment: lambda.FunctionEnvironmentArgs{
				Variables: pulumi.StringMap{
					"TABLE": table.Name,
				},
			},
			Handler: pulumi.String("handler"),
			Role:    role.Arn,
			Runtime: pulumi.String("go1.x"),
		})

		// Create an API Gateway
		apigateway, err := apigatewayv2.NewApi(ctx, "apigateway", &apigatewayv2.ApiArgs{
			CorsConfiguration: apigatewayv2.ApiCorsConfigurationArgs{
				AllowHeaders: pulumi.ToStringArray([]string{
					"Content-Type",
				}),
				AllowMethods: pulumi.ToStringArray([]string{
					"GET",
					"POST",
					"DELETE",
				}),
				AllowOrigins: pulumi.ToStringArray([]string{
					"*",
				}),
			},
			ProtocolType: pulumi.String("HTTP"),
			Description:  pulumi.String("To-Do API"),
		})
		if err != nil {
			return err
		}

		// Create an Integrate with Lambda function
		integration, err := apigatewayv2.NewIntegration(ctx, "apigateway-lambda-integration", &apigatewayv2.IntegrationArgs{
			ApiId:           apigateway.ID(),
			IntegrationType: pulumi.String("AWS_PROXY"),
			IntegrationUri:  function.InvokeArn,
		})

		// Add a route to get To-Do List
		addToDoRoute, err := apigatewayv2.NewRoute(ctx, "route-to-get-todo", &apigatewayv2.RouteArgs{
			ApiId:    apigateway.ID(),
			RouteKey: pulumi.String("GET /todo"),
			Target:   pulumi.Sprintf("integrations/%s", integration.ID()),
		})
		if err != nil {
			return err
		}

		// Add a route to post To-Do
		postToDoRoute, err := apigatewayv2.NewRoute(ctx, "route-to-post-todo", &apigatewayv2.RouteArgs{
			ApiId:    apigateway.ID(),
			RouteKey: pulumi.String("POST /todo"),
			Target:   pulumi.Sprintf("integrations/%s", integration.ID()),
		})
		if err != nil {
			return err
		}

		// Add a route to delete To-Do
		deleteToDoRoute, err := apigatewayv2.NewRoute(ctx, "route-to-delete-todo", &apigatewayv2.RouteArgs{
			ApiId:    apigateway.ID(),
			RouteKey: pulumi.String("DELETE /todo/{id}"),
			Target:   pulumi.Sprintf("integrations/%s", integration.ID()),
		})
		if err != nil {
			return err
		}

		// Add a resource based policy to Lambda
		if _, err = lambda.NewPermission(ctx, "invoke-lambda-permission", &lambda.PermissionArgs{
			Action:    pulumi.String("lambda:InvokeFunction"),
			Function:  function.Name,
			Principal: pulumi.String("apigateway.amazonaws.com"),
		}); err != nil {
			return err
		}

		// Deploy the API
		deployment, err := apigatewayv2.NewDeployment(ctx, "api-deployment", &apigatewayv2.DeploymentArgs{
			ApiId: apigateway.ID(),
		}, pulumi.DependsOn([]pulumi.Resource{addToDoRoute, postToDoRoute, deleteToDoRoute}))
		if err != nil {
			return err
		}

		// Create a Stage for API
		stage, err := apigatewayv2.NewStage(ctx, "api-stage", &apigatewayv2.StageArgs{
			ApiId:        apigateway.ID(),
			DeploymentId: deployment.ID(),
		})
		if err != nil {
			return err
		}

		// Create a S3 Bucket
		bucket, err := s3.NewBucket(ctx, "s3-website-bucket", &s3.BucketArgs{
			Website: s3.BucketWebsiteArgs{
				IndexDocument: pulumi.String("index.html"),
			},
		})
		if err != nil {
			return err
		}

		// Upload web contents
		siteDir := "www"
		files, err := ioutil.ReadDir(siteDir)
		if err != nil {
			return err
		}
		for _, item := range files {
			name := item.Name()
			if _, err := s3.NewBucketObject(ctx, name, &s3.BucketObjectArgs{
				Acl:         pulumi.String("public-read"),
				ContentType: pulumi.String(mime.TypeByExtension(path.Ext(name))),
				Bucket:      bucket.ID(),
				Source:      pulumi.NewFileAsset(filepath.Join(siteDir, name)),
			}); err != nil {
				return err
			}
		}

		// Upload an application config object
		if _, err = s3.NewBucketObject(ctx, "config.js", &s3.BucketObjectArgs{
			Acl:         pulumi.String("public-read"),
			ContentType: pulumi.String("text/javascript"),
			Bucket:      bucket.ID(),
			Content:     pulumi.Sprintf("const API_ENDPOINT=\"%s\"", stage.InvokeUrl),
		}, pulumi.DependsOn([]pulumi.Resource{stage})); err != nil {
			return err
		}

		// Export application URL
		ctx.Export("Application URL", pulumi.Sprintf("http://%s", bucket.WebsiteEndpoint))
		return nil
	})
}
