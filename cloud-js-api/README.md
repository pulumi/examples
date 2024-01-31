[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-api/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-api/README.md#gh-dark-mode-only)

# Serverless REST API on AWS

A simple REST API that counts the number of times a route has been hit. For a detailed walkthrough of this example, see the article [Create a Serverless REST API](https://www.pulumi.com/docs/tutorials/aws/rest-api/).

> Note: this example uses JavaScript promises, but if you're using Node 8, you can change the code to use `async` and `await`.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init count-api-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update of stack 'count-api-testing'
    ...

    Updating stack 'count-api-testing'
    Performing changes:

        Type                                      Name                                     Status      Info
    +   pulumi:pulumi:Stack                       cloud-js-httpendpoint-count-api-testing  created
    +   ├─ cloud:table:Table                      counterTable                             created
    +   │  └─ aws:dynamodb:Table                  counterTable                             created
    +   └─ cloud:http:HttpEndpoint                hello-world                              created
    +      ├─ cloud:function:Function             hello-world4fcc7b60                      created
    +      │  └─ aws:serverless:Function          hello-world4fcc7b60                      created
    +      │     ├─ aws:iam:Role                  hello-world4fcc7b60                      created
    +      │     ├─ aws:lambda:Function           hello-world4fcc7b60                      created
    +      │     ├─ aws:iam:RolePolicyAttachment  hello-world4fcc7b60-32be53a2             created
    +      │     └─ aws:iam:RolePolicyAttachment  hello-world4fcc7b60-fd1a00e5             created
    +      ├─ aws:apigateway:RestApi              hello-world                              created
    +      ├─ aws:apigateway:Deployment           hello-world                              created
    +      ├─ aws:lambda:Permission               hello-world-4fcc7b60                     created
    +      └─ aws:apigateway:Stage                hello-world                              created

    ---outputs:---
    endpoint: "https://***.us-west-2.amazonaws.com/stage/"

    info: 14 changes performed:
        + 14 resources created
    Update duration: ***
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.us-west-2.amazonaws.com/stage/

    $ curl $(pulumi stack output endpoint)/hello
    {"route":"hello","count":1}
    $ curl $(pulumi stack output endpoint)/hello
    {"route":"hello","count":2}
    $ curl $(pulumi stack output endpoint)/woohoo
    {"route":"woohoo","count":1}
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
