[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-appsync/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-appsync/README.md#gh-dark-mode-only)

# GraphQL endpoint in AWS AppSync

This example shows how to set up a basic GraphQL endpoint in AWS AppSync. The endpoint contains one query and one mutation that get and put items to a Dynamo DB table.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
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
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 10 created
    Duration: 20s
    ```

1.  Check the deployed GraphQL endpoint:

    ```bash
    pulumi stack output endpoint
    pulumi stack output key
    curl -XPOST -H "Content-Type:application/graphql" -H "x-api-key:$(pulumi stack output key)" -d '{ "query": "mutation AddTenant { addTenant(id: \"123\", name: \"FirstCorp\") { id name } }" }' "$(pulumi stack output endpoint)"
    ```

    ```
    https://***.appsync-api.us-east-2.amazonaws.com/graphql
    ***sensitivekey***
    {
        "data": {
            "addTenant": {
                "id": "123",
                "name": "FirstCorp"
            }
        }
    }
    ```

## Cleaning up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
