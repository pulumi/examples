# Serverless REST API on AWS

A simple REST API that counts the number of times a route has been hit. This app behaves the same as [the version using Pulumi's higher level cloud-agnostic framework](../cloud-js-httpendpoint/README.md), but is written using the lower level `@pulumi/aws-serverless` framework.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init count-api-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Restore NPM modules via `npm install`.

1.  Run `pulumi update` to preview and deploy changes:

    ```
    $ pulumi update
    Previewing update of stack 'count-api-testing'
    ...

    Updating stack 'count-api-testing'
    Performing changes:
    
         Type                                Name                                              Status      Info
     +   pulumi:pulumi:Stack                 aws-serverless-js-httpendpoint-count-api-testing  created     
     +   ├─ aws-serverless:apigateway:API    api                                               created     
     +   │  ├─ aws:apigateway:RestApi        api                                               created     
     +   │  ├─ aws:apigateway:Deployment     api                                               created     
     +   │  ├─ aws:lambda:Permission         api-4fcc7b60                                      created     
     +   │  └─ aws:apigateway:Stage          api                                               created     
     +   ├─ aws:serverless:Function          api4fcc7b60                                       created     
     +   │  ├─ aws:iam:Role                  api4fcc7b60                                       created     
     +   │  ├─ aws:iam:RolePolicyAttachment  api4fcc7b60-32be53a2                              created     
     +   │  └─ aws:lambda:Function           api4fcc7b60                                       created     
     +   └─ aws:dynamodb:Table               counterTable                                      created     
     
    ---outputs:---
    endpoint: "https://ih8ljmupjc.execute-api.us-west-2.amazonaws.com/stage/"
    
    info: 11 changes performed:
        + 11 resources created
    Update duration: 26.425999756s
    ```

1.  View the endpoint URL and curl a few routes:

    ```bash
    $ pulumi stack output 
    Current stack outputs (1):
        OUTPUT            VALUE
        endpoint          https://ih8ljmupjc.execute-api.us-west-2.amazonaws.com/stage/
    
    $ curl $(pulumi stack output endpoint)/hello
    {"route":"hello","count":1}
    $ curl $(pulumi stack output endpoint)/woohoo
    {"route":"woohoo","count":1}
    ```

1.  To view the runtime logs of the Lambda function, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.
