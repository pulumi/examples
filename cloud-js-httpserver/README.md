[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-httpserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-httpserver/README.md#gh-dark-mode-only)

# Serverless REST API on AWS

A simple REST API that counts the number of times a route has been hit.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init count-api-testing
    ```

1.  Set the provider and region for AWS:

    ```
    $ pulumi config set cloud:provider aws
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

        Type                                      Name                                 Status      Info
    +   pulumi:pulumi:Stack                       cloud-js-httpserver-routecount-luke  created
    +   ├─ cloud:httpserver:HttpServer            routecount                           created
    +   │  ├─ cloud:function:Function             routecount                           created
    +   │  │  └─ aws:serverless:Function          routecount                           created
    +   │  │     ├─ aws:iam:Role                  routecount                           created
    +   │  │     ├─ aws:iam:RolePolicyAttachment  routecount-fd1a00e5                  created
    +   │  │     ├─ aws:iam:RolePolicyAttachment  routecount-32be53a2                  created
    +   │  │     └─ aws:lambda:Function           routecount                           created
    +   │  ├─ aws:apigateway:RestApi              routecount                           created
    +   │  ├─ aws:apigateway:Deployment           routecount                           created
    +   │  ├─ aws:apigateway:Stage                routecount                           created
    +   │  ├─ aws:lambda:Permission               routecount-b9de55a3                  created
    +   │  └─ aws:lambda:Permission               routecount-e1615237                  created
    +   └─ cloud:table:Table                      counterTable                         created
    +      └─ aws:dynamodb:Table                  counterTable                         created

        ---outputs:---
        endpoint: "https://zxvi8hpmak.execute-api.us-west-2.amazonaws.com/stage/"

    info: 15 changes performed:
        + 15 resources created
    Update duration: 32.322463714s
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://***.us-west-2.amazonaws.com/stage/

    $ curl $(pulumi stack output endpoint)/hello
    {"route":"/hello","count":1}
    $ curl $(pulumi stack output endpoint)/hello
    {"route":"/hello","count":2}
    $ curl $(pulumi stack output endpoint)/woohoo
    {"route":"/woohoo","count":1}
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
