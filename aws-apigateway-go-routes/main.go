package main

import (
	apigateway "github.com/pulumi/pulumi-aws-apigateway/sdk/go/apigateway"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/cognito"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lambda"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		role, err := iam.NewRole(ctx, "auth-exec-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Sid": "",
					"Effect": "Allow",
					"Principal": {
						"Service": "lambda.amazonaws.com"
					},
					"Action": "sts:AssumeRole"
				}]
			}`),
		})
		if err != nil {
			return err
		}

		logPolicy, err := iam.NewRolePolicy(ctx, "lambda-log-policy", &iam.RolePolicyArgs{
			Role: role.Name,
			Policy: pulumi.String(`{
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents"
                    ],
                    "Resource": "arn:aws:logs:*:*:*"
                }]
            }`),
		})
		if err != nil {
			return err
		}

		authLambda, err := lambda.NewFunction(ctx, "auth-lambda", &lambda.FunctionArgs{
			Runtime: lambda.RuntimePython3d8,
			Code: pulumi.NewAssetArchive(map[string]interface{}{
				".": pulumi.NewFileArchive("./bin/authorizer.zip"),
			}),
			Handler: pulumi.String("handler"),
			Role:    role.Arn,
		}, pulumi.DependsOn([]pulumi.Resource{logPolicy}))
		if err != nil {
			return err
		}

		helloHandler, err := lambda.NewFunction(ctx, "hello-handler", &lambda.FunctionArgs{
			Runtime: lambda.RuntimePython3d8,
			Code: pulumi.NewAssetArchive(map[string]interface{}{
				".": pulumi.NewFileArchive("./bin/handler.zip"),
			}),
			Handler: pulumi.String("handler"),
			Role:    role.Arn,
		}, pulumi.DependsOn([]pulumi.Resource{logPolicy}))
		if err != nil {
			return err
		}

		userPool, err := cognito.NewUserPool(ctx, "user-pool", &cognito.UserPoolArgs{})
		if err != nil {
			return err
		}

		userPoolClient, err := cognito.NewUserPoolClient(ctx, "user-pool-client", &cognito.UserPoolClientArgs{
			UserPoolId:        userPool.ID(),
			ExplicitAuthFlows: pulumi.ToStringArray([]string{"ADMIN_NO_SRP_AUTH"}),
		})
		if err != nil {
			return err
		}

		// Define an endpoint that invokes a lambda to handle requests
		www := "www"
		custom := "custom"
		request := "request"
		getMethod := apigateway.MethodGET
		restAPI, err := apigateway.NewRestAPI(ctx, "api", &apigateway.RestAPIArgs{
			Routes: []apigateway.RouteArgs{
				{ // Serve an entire directory of static content
					Path:      "static",
					LocalPath: &www,
				},
				{ // Invoke our Lambda to handle a single route
					Path:         "lambda",
					Method:       &getMethod,
					EventHandler: helloHandler,
				},
				{ // Proxy requests to another service
					Path: "proxy",
					Target: apigateway.TargetArgs{
						Type: apigateway.IntegrationType_Http_proxy,
						Uri:  pulumi.String("https://www.google.com"),
					},
				},
				{ // Authorize requests using Cognito
					Path:         "cognito-authorized",
					Method:       &getMethod,
					EventHandler: helloHandler,
					Authorizers: []apigateway.AuthorizerArgs{
						{
							ParameterName:  "Authorization",
							IdentitySource: []string{"method.request.header.Authorization"},
							ProviderARNs:   pulumi.StringArray(pulumi.StringArray{userPool.Arn}),
						},
					},
				},
				{
					Path:         "lambda-authorized",
					Method:       &getMethod,
					EventHandler: helloHandler,
					Authorizers: []apigateway.AuthorizerArgs{
						{
							AuthType:       &custom,
							ParameterName:  "Authorization",
							Type:           &request,
							IdentitySource: []string{"method.request.header.Authorization"},
							Handler:        authLambda,
						},
					},
				},
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("url", restAPI.Url)
		ctx.Export("user-pool-id", userPool.ID())
		ctx.Export("user-pool-client-id", userPoolClient.ID())
		return nil
	})
}
