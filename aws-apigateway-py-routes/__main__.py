# Copyright 2016-2021, Pulumi Corporation.
import json
import pulumi
import pulumi_aws as aws
import pulumi_aws_apigateway as apigateway
import lambdas
from dns import configure_dns

# Create a Cognito User Pool of authorized users
user_pool = aws.cognito.UserPool("user-pool")
user_pool_client = aws.cognito.UserPoolClient(
    "user-pool-client", user_pool_id=user_pool.id, explicit_auth_flows=["ADMIN_NO_SRP_AUTH"])

# Define an endpoint that invokes a lambda to handle requests
api = apigateway.RestAPI('api', routes=[
    # Serve an entire directory of static content
    apigateway.RouteArgs(path="static", local_path="www"),
    # Invoke our Lambda to handle a single route
    apigateway.RouteArgs(path="lambda", method="GET",
                         event_handler=lambdas.hello_handler),
    # Proxy requests to another service
    apigateway.RouteArgs(path="proxy", target=apigateway.TargetArgs(
        uri="https://www.google.com", type="http_proxy")),
    # Use Swagger to define an HTTP proxy route
    apigateway.RouteArgs(path="swagger", method="GET", data={
        "x-amazon-apigateway-integration": {
            "httpMethod": "GET",
            "passthroughBehavior": "when_no_match",
            "type": "http_proxy",
            "uri": "https://httpbin.org/uuid",
        },
    }),
    # Authorize requests using Cognito
    apigateway.RouteArgs(
        path="cognito-authorized",
        method="GET",
        event_handler=lambdas.hello_handler,
        # Define an authorizer which uses Cognito to validate the token from the Authorization header
        authorizers=[apigateway.AuthorizerArgs(
            parameter_name="Authorization",
            identity_source=["method.request.header.Authorization"],
            provider_arns=[user_pool.arn]
        )]
    ),
    # Authorize requests using a Lambda function
    apigateway.RouteArgs(path="lambda-authorized", method="GET", event_handler=lambdas.hello_handler,
                         authorizers=[apigateway.AuthorizerArgs(
                             auth_type="custom",
                             parameter_name="Authorization",
                             type="request",
                             identity_source=[
                                 "method.request.header.Authorization"],
                             handler=lambdas.auth_lambda
                         )]),
    apigateway.RouteArgs(path="key-authorized", method="GET",
                         event_handler=lambdas.hello_handler,
                         api_key_required=True)
])

# Define whole API using swagger (OpenAPI)
swagger_api = apigateway.RestAPI("swagger-api",
                                 swagger_string=json.dumps({
                                     "swagger": "2.0",
                                     "info": {
                                         "title": "example",
                                         "version": "1.0",
                                     },
                                     "paths": {
                                         "/": {
                                             "get": {
                                                 "x-amazon-apigateway-integration": {
                                                     "httpMethod": "GET",
                                                     "passthroughBehavior": "when_no_match",
                                                     "type": "http_proxy",
                                                     "uri": "https://httpbin.org/uuid",
                                                 },
                                             },
                                         },
                                     },
                                     "x-amazon-apigateway-binary-media-types": ["*/*"],
                                 })
                                 )

# Create an API key to manage usage
api_key = aws.apigateway.ApiKey("api-key")
# Define usage plan for an API stage
usage_plan = aws.apigateway.UsagePlan("usage-plan",
                                      api_stages=[aws.apigateway.UsagePlanApiStageArgs(
                                          api_id=api.api.id,
                                          stage=api.stage.stage_name)])
# Associate the key to the plan
aws.apigateway.UsagePlanKey('usage-plan-key',
                            key_id=api_key.id,
                            key_type="API_KEY",
                            usage_plan_id=usage_plan.id)

# Set up DNS if a domain name has been configured
config = pulumi.Config()
domain = config.get("domain")
if domain != None:
    # Load DNS zone for the domain
    zone = aws.route53.get_zone_output(name=config.require("dns-zone"))
    # Create SSL Certificate and DNS entries
    api_domain_name = configure_dns(domain=domain, zone_id=zone.id)
    # Tell API Gateway what to serve on our custom domain
    base_path_mapping = aws.apigateway.BasePathMapping("api-domain-mapping",
                                                       rest_api=api.api.id,
                                                       stage_name=api.stage.stage_name,
                                                       domain_name=api_domain_name.domain_name)
    pulumi.export(
        "custom-url", base_path_mapping.domain_name.apply(lambda domain: f'https://{domain}/'))

pulumi.export("url", api.url)
pulumi.export("user-pool-id", user_pool.id)
pulumi.export("user-pool-client-id", user_pool_client.id)
pulumi.export("swagger-url", swagger_api.url)
pulumi.export("api-key-value", api_key.value)
