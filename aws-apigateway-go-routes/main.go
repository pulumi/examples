// Copyright 2016-2021, Pulumi Corporation.
package main

import (
	apigateway "github.com/pulumi/pulumi-aws-apigateway/sdk/v2/go/apigateway"
	awsapigateway "github.com/pulumi/pulumi-aws/sdk/v6/go/aws/apigateway"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cognito"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/route53"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
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
		apiKeyRequired := true
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
				{ // Use Swagger to define an HTTP proxy route
					Path:   "swagger",
					Method: &getMethod,
					Data: map[string]interface{}{
						"x-amazon-apigateway-integration": map[string]interface{}{
							"httpMethod":          "GET",
							"passthroughBehavior": "when_no_match",
							"type":                "http_proxy",
							"uri":                 "https://httpbin.org/uuid",
						},
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
				{
					Path:           "key-authorized",
					Method:         &getMethod,
					EventHandler:   helloHandler,
					ApiKeyRequired: &apiKeyRequired,
				},
			},
		})
		if err != nil {
			return err
		}

		// Define whole API using swagger (OpenAPI)
		swaggerAPI, err := apigateway.NewRestAPI(ctx, "swagger-api", &apigateway.RestAPIArgs{
			SwaggerString: pulumi.String(`{
				"swagger": "2.0",
				"info": {
					"title": "example",
					"version": "1.0"
				},
				"paths": {
					"/": {
						"get": {
							"x-amazon-apigateway-integration": {
								"httpMethod": "GET",
								"passthroughBehavior": "when_no_match",
								"type": "http_proxy",
								"uri": "https://httpbin.org/uuid"
							}
						}
					}
				},
				"x-amazon-apigateway-binary-media-types": ["*/*"]
			}`),
		})
		if err != nil {
			return err
		}

		// Create an API key to manage usage
		apiKey, err := awsapigateway.NewApiKey(ctx, "api-key", &awsapigateway.ApiKeyArgs{})
		if err != nil {
			return err
		}
		apiId := restAPI.Api.ApplyT(func(api *awsapigateway.RestApi) pulumi.StringOutput {
			return api.ID().ToStringOutput()
		}).ApplyT(func(id interface{}) string {
			return id.(string)
		}).(pulumi.StringOutput)
		stageName := restAPI.Stage.ApplyT(func(stage *awsapigateway.Stage) pulumi.StringOutput {
			return stage.StageName
		}).ApplyT(func(stageName interface{}) string {
			return stageName.(string)
		}).(pulumi.StringOutput)
		// Define usage plan for an API stage
		usagePlan, err := awsapigateway.NewUsagePlan(ctx, "usage-plan", &awsapigateway.UsagePlanArgs{
			ApiStages: awsapigateway.UsagePlanApiStageArray{
				awsapigateway.UsagePlanApiStageArgs{
					ApiId: apiId,
					Stage: stageName,
				},
			},
		})
		if err != nil {
			return err
		}
		// Associate the key to the plan
		_, err = awsapigateway.NewUsagePlanKey(ctx, "usage-plan-key", &awsapigateway.UsagePlanKeyArgs{
			KeyId:       apiKey.ID(),
			KeyType:     pulumi.String("API_KEY"),
			UsagePlanId: usagePlan.ID(),
		})
		if err != nil {
			return err
		}
		ctx.Export("api-key-value", apiKey.Value)

		// Set up DNS if a domain name has been configured
		conf := config.New(ctx, "")
		domain := conf.Get("domain")
		if domain != "" {
			// Load DNS zone for the domain
			dnsZone := conf.Require("dns-zone")
			zone, err := route53.LookupZone(ctx, &route53.LookupZoneArgs{Name: &dnsZone})
			if err != nil {
				return err
			}
			// Create SSL Certificate and DNS entries
			apiDomainName, err := configureDns(ctx, domain, zone.ZoneId)
			if err != nil {
				return err
			}
			// Tell API Gateway what to serve on our custom domain
			basePathMapping, err := awsapigateway.NewBasePathMapping(ctx,
				"api-domain-mapping",
				&awsapigateway.BasePathMappingArgs{
					RestApi:    apiId,
					StageName:  stageName,
					DomainName: apiDomainName.DomainName,
				},
			)
			customUrl := pulumi.Sprintf("https://%s/", basePathMapping.DomainName)
			ctx.Export("custom-url", customUrl)
		}

		ctx.Export("url", restAPI.Url)
		ctx.Export("user-pool-id", userPool.ID())
		ctx.Export("user-pool-client-id", userPoolClient.ID())
		ctx.Export("swagger-url", swaggerAPI.Url)
		return nil
	})
}
