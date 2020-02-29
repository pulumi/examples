[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# GraphQL Endpoint in AWS AppSync

This example shows how to setup a basic GraphQL endpoint in AWS AppSync. The endpoint contains one query and one mutation that get and put items to a Dynamo DB table.

## Deploying and running the Pulumi App

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-east-2
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.


    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 10 created
    Duration: 20s
    ```

1. Check the deployed GraphQL endpoint:

    ```bash
    $ pulumi stack output endpoint
    https://***.appsync-api.us-east-2.amazonaws.com/graphql
    $ pulumi stack output key
    ***sensitivekey***
    $ curl -XPOST -H "Content-Type:application/graphql" -H "x-api-key:$(pulumi stack output key)" -d '{ "query": "mutation AddTenant { addTenant(id: \"123\", name: \"FirstCorp\") { id name } }" }' "$(pulumi stack output endpoint)" 
    {
        "data": {
            "addTenant": {
                "id": "123",
                "name": "FirstCorp"
            }
        }
    }
    ```

## Clean up

1. Run `pulumi destroy` to tear down all resources.

1. To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.
