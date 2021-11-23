import pulumi
import pulumi_aws as aws
import pulumi_apigateway as apigateway
import lambdas

# Create a Cognito User Pool of authorized users
user_pool = aws.cognito.UserPool("user-pool")

# Define an endpoint that invokes a lambda to handle requests
api = apigateway.RestAPI('api', routes=[
    # Serve an entire directory of static content
    apigateway.RouteArgs(path="static", local_path="www"),
    # Invoke our Lambda to handle a single route
    apigateway.RouteArgs(path="lambda", method="GET",
                         event_handler=hello_handler),
    # Proxy requests to another service
    apigateway.RouteArgs(path="proxy", target=apigateway.TargetArgs(
        uri="https://www.google.com", type="http_proxy")),
    # Authorize requests using Cognito
    apigateway.RouteArgs(
        path="cognito-authorized",
        event_handler=hello_handler,
        # Define an authorizer which uses Cognito to validate the token from the Authorization header
        authorizers=[apigateway.AuthorizerArgs(
            parameterName="Authorization",
            identitySource=["method.request.header.Authorization"],
            providerARNs=[user_pool.arn]
        )]
    ),
    # Authorize requests using a Lambda function
    apigateway.RouteArgs(path="lambda-authorized", method="GET", event_handler=hello_handler,
                         authorizers=[apigateway.AuthorizerArgs(
                             auth_type="custom",
                             parameter_name="Authorization",
                             type="request",
                             identity_source=[
                                 "method.request.header.Authorization"],
                             handler=auth_lambda
                         )]),
])

pulumi.export('url', api.url)
