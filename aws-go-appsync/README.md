[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-appsync/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-appsync/README.md#gh-dark-mode-only)

# GraphQL endpoint in AWS AppSync (in Go)

This example shows how to setup a basic GraphQL endpoint in AWS AppSync. The endpoint contains one query and one mutation that get and put items to a Dynamo DB table.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install dependencies:

    ```bash
    go mod download
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. Check the deployed GraphQL endpoint:

    ```bash
    curl -XPOST -H "Content-Type:application/graphql" -H "x-api-key:$(pulumi stack output key)" -d '{ "query": "mutation AddTenant { addTenant(id: \"123\", name: \"FirstCorp\") { id name } }" }' "$(pulumi stack output endpoint)"
    ```

    ```
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

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
