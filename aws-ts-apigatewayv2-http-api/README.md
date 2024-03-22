[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigatewayv2-http-api/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigatewayv2-http-api/README.md#gh-dark-mode-only)

# AWS API Gateway V2 HTTP API

Set up a HTTP API using AWS API Gateway V2, complete with a route, stage and integration.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init http-api
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (http-api)
    ...

    Updating (http-api)

         Type                             Name                                   Status
     +   pulumi:pulumi:Stack              aws-ts-apigatewayv2-http-api-http-api  created
     +   ├─ aws:apigatewayv2:Api          httpApiGateway                         created
     +   ├─ aws:iam:Role                  lambdaRole                             created
     +   ├─ aws:lambda:Function           lambdaFunction                         created
     +   ├─ aws:iam:RolePolicyAttachment  lambdaRoleAttachment                   created
     +   ├─ aws:lambda:Permission         lambdaPermission                       created
     +   ├─ aws:apigatewayv2:Integration  lambdaIntegration                      created
     +   ├─ aws:apigatewayv2:Route        apiRoute                               created
     +   └─ aws:apigatewayv2:Stage        apiStage                               created

    Outputs:
        endpoint: "https://****.execute-api.us-east-2.amazonaws.com/http-api"

    Resources:
        + 9 created

    Duration: 33s
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.execute-api.us-east-2.amazonaws.com/http-api

    $ curl $(pulumi stack output endpoint)
    Hello, Pulumi!
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
