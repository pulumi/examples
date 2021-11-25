// Copyright 2016-2021, Pulumi Corporation.
package main

import (
	apigateway "github.com/pulumi/pulumi-aws-apigateway/sdk/go/apigateway"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/cognito"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		authLambda, helloHandler, err := createLambdas(ctx)
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

		// // Create an API key to manage usage
		// apiKey, err := awsapigateway.NewApiKey(ctx, "api-key", &awsapigateway.ApiKeyArgs{})
		// if err != nil {
		// 	return err
		// }
		// // Define usage plan for an API stage
		// usagePlan, err := awsapigateway.NewUsagePlan(ctx, "usage-plan", &awsapigateway.UsagePlanArgs{
		// 	ApiStages: awsapigateway.UsagePlanApiStageArray{
		// 		awsapigateway.UsagePlanApiStageArgs{
		// 			ApiId: restAPI.Api.ID(), // API and Stage aren't currently typed in Go.
		// 			Stage: restAPI.Stage.StateName,
		// 		},
		// 	},
		// })
		// if err != nil {
		// 	return err
		// }
		// usagePlanKey, err := awsapigateway.NewUsagePlanKey(ctx, "usage-plan-key", &awsapigateway.UsagePlanKeyArgs{
		// 	KeyId:       apiKey.ID(),
		// 	KeyType:     pulumi.String("API_KEY"),
		// 	UsagePlanId: usagePlan.ID(),
		// })
		// if err != nil {
		// 	return err
		// }
		// ctx.Export("usage-plan-id", usagePlanKey.UsagePlanId)
		// ctx.Export("api-key-value", apiKey.Value)

		ctx.Export("url", restAPI.Url)
		ctx.Export("user-pool-id", userPool.ID())
		ctx.Export("user-pool-client-id", userPoolClient.ID())
		return nil
	})
}
