[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway/README.md#gh-dark-mode-only)

# Serverless REST API

A simple REST API that counts the number of times a route has been hit. For a detailed walkthrough of this example, see the article [Create a Serverless REST API](https://www.pulumi.com/docs/tutorials/aws/rest-api/).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    pulumi stack init count-api-testing
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
    Previewing update of stack 'count-api-testing'
    ...

    Updating (count-api-testing):

         Type                                Name                                 Status
     +   pulumi:pulumi:Stack                 aws-ts-apigateway-count-api-testing  created
     +   ├─ aws:apigateway:x:API             hello-world                          created
     +   │  ├─ aws:iam:Role                  hello-world4fcc7b60                  created
     +   │  ├─ aws:iam:RolePolicyAttachment  hello-world4fcc7b60-32be53a2         created
     +   │  ├─ aws:lambda:Function           hello-world4fcc7b60                  created
     +   │  ├─ aws:apigateway:RestApi        hello-world                          created
     +   │  ├─ aws:apigateway:Deployment     hello-world                          created
     +   │  ├─ aws:lambda:Permission         hello-world-a552609d                 created
     +   │  └─ aws:apigateway:Stage          hello-world                          created
     +   └─ aws:dynamodb:Table               counterTable                         created

    Outputs:
        endpoint: "https://***execute-api.us-east-2.amazonaws.com/stage/"

    Resources:
        + 10 created

    Duration: 24s
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    pulumi stack output
    curl $(pulumi stack output endpoint)/hello
    curl $(pulumi stack output endpoint)/hello
    curl $(pulumi stack output endpoint)/woohoo
    ```

    ```
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.us-east-2.amazonaws.com/stage/

    {"route":"hello","count":1}
    {"route":"hello","count":2}
    {"route":"woohoo","count":1}
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Cleaning up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
