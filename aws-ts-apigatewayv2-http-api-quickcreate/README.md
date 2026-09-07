[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigatewayv2-http-api-quickcreate/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigatewayv2-http-api-quickcreate/README.md#gh-dark-mode-only)

# AWS API Gateway V2 HTTP API quickstart

Set up a simple HTTP API using AWS API Gateway V2

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    pulumi stack init http-api
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing update (http-api)
    ...

    Updating (http-api)

        Type                             Name                                     Status
    +   pulumi:pulumi:Stack              aws-ts-apigatewayv2-quickstart-http-api  created
    +   ├─ aws:iam:Role                  lambdaRole                               created
    +   ├─ aws:lambda:Function           lambdaFunction                           created
    +   ├─ aws:iam:RolePolicyAttachment  lambdaRoleAttachment                     created
    +   ├─ aws:apigatewayv2:Api          httpApiGateway                           created
    +   └─ aws:lambda:Permission         lambdapermission                         created

    Outputs:
        endpoint: "https://****.execute-api.us-east-2.amazonaws.com"

    Resources:
        + 6 created

    Duration: 22s
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    pulumi stack output
    curl $(pulumi stack output endpoint)
    ```

    ```
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.execute-api.us-east-2.amazonaws.com

    Hello, Pulumi!
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Cleaning up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
