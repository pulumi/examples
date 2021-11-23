import pulumi
import pulumi_aws as aws
import pulumi_aws_apigateway as apigateway
import lambdas_

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
                         event_handler=lambdas_.hello_handler),
    # Proxy requests to another service
    apigateway.RouteArgs(path="proxy", target=apigateway.TargetArgs(
        uri="https://www.google.com", type="http_proxy")),
    # Authorize requests using Cognito
    apigateway.RouteArgs(
        path="cognito-authorized",
        method="GET",
        event_handler=lambdas_.hello_handler,
        # Define an authorizer which uses Cognito to validate the token from the Authorization header
        authorizers=[apigateway.AuthorizerArgs(
            parameter_name="Authorization",
            identity_source=["method.request.header.Authorization"],
            provider_arns=[user_pool.arn]
        )]
    ),
    # Authorize requests using a Lambda function
    apigateway.RouteArgs(path="lambda-authorized", method="GET", event_handler=lambdas_.hello_handler,
                         authorizers=[apigateway.AuthorizerArgs(
                             auth_type="custom",
                             parameter_name="Authorization",
                             type="request",
                             identity_source=[
                                 "method.request.header.Authorization"],
                             handler=lambdas_.auth_lambda
                         )]),
])

pulumi.export('url', api.url)
pulumi.export('user-pool-id', user_pool.id)
pulumi.export('user-pool-client-id', user_pool_client.id)
