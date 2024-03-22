[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway/README.md#gh-dark-mode-only)

# Serverless REST API

A simple REST API that counts the number of times a route has been hit. For a detailed walkthrough of this example, see the article [Create a Serverless REST API](https://www.pulumi.com/docs/tutorials/aws/rest-api/).

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init count-api-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
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
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.us-east-2.amazonaws.com/stage/

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
